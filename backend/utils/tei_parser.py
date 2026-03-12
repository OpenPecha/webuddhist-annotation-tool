"""TEI XML parser for webuddhist annotation tool.

Parses TEI P5 documents (Transkribus/OpenPecha style) and extracts:
- Title from teiHeader
- Plain text content from body (prefers segmented > normalized > diplomatic)
- POS annotations from annotated layer (w elements with lemma, pos)
- Editorial annotations from diplomatic layer (add, unclear, hi, decoration)
"""

import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import List, Optional, Set, Tuple

TEI_NS = "http://www.tei-c.org/ns/1.0"

# Editorial TEI elements to extract as annotations
EDITORIAL_ELEMENTS = {"add", "unclear", "hi", "decoration"}


@dataclass
class TEIAnnotation:
    """Parsed annotation from TEI - POS (w) or editorial (add, unclear, hi, decoration)."""
    start_position: int
    end_position: int
    selected_text: str
    label: Optional[str] = None  # POS tag or editorial element name
    meta: Optional[dict] = None  # lemma, place, etc.
    is_editorial: bool = False  # True if from add/unclear/hi/decoration


@dataclass
class TEIParseResult:
    """Result of parsing a TEI document."""
    title: str
    content: str
    annotations: List[TEIAnnotation]  # POS from annotated layer
    editorial_annotations: List[TEIAnnotation] = field(default_factory=list)  # add, unclear, hi, decoration
    source: str = "TEI XML"
    diplomatic_text: Optional[str] = None  # Plain text from div type=transcription subtype=diplomatic
    pos_values: Optional[Set[str]] = None  # Distinct POS tags from XML
    editorial_labels: Optional[Set[str]] = None  # Distinct editorial element names from XML


def _ns(tag: str) -> str:
    """Add TEI namespace to tag name."""
    if tag.startswith("{"):
        return tag
    return f"{{{TEI_NS}}}{tag}"


def _text_content(elem: ET.Element) -> str:
    """Get all text content including descendants, concatenated."""
    if elem.text:
        parts = [elem.text]
    else:
        parts = []
    for child in elem:
        parts.append(_text_content(child))
        if child.tail:
            parts.append(child.tail)
    return "".join(parts).strip()


def _extract_title(root: ET.Element) -> str:
    """Extract title from teiHeader."""
    title_elem = root.find(f".//{_ns('titleStmt')}/{_ns('title')}")
    if title_elem is not None and title_elem.text:
        return title_elem.text.strip()
    return "Untitled TEI"


def _local_name(tag: str) -> str:
    """Get local tag name without namespace."""
    return tag.split("}")[-1] if "}" in tag else tag


def _text_and_editorial_from_diplomatic(
    body: ET.Element,
) -> tuple[str, List[TEIAnnotation]]:
    """Extract plain text and editorial annotations from diplomatic layer.
    Walks ab/lb and inline elements; records add, unclear, hi, decoration spans.
    """
    parts: List[str] = []
    editorial: List[TEIAnnotation] = []
    current_pos = 0

    def _emit(text: str) -> None:
        nonlocal current_pos
        if text:
            parts.append(text)
            current_pos += len(text)

    def _walk_inline(elem: ET.Element) -> None:
        """Walk mixed content, recording editorial spans."""
        if elem.text:
            _emit(elem.text)
        for child in elem:
            local = _local_name(child.tag)
            if local in EDITORIAL_ELEMENTS:
                text = _text_content(child)
                if text:
                    start = current_pos
                    _emit(text)
                    meta = {}
                    if local == "add" and child.get("place"):
                        meta["place"] = child.get("place")
                    if local == "hi" and child.get("style"):
                        meta["style"] = child.get("style")
                    editorial.append(
                        TEIAnnotation(
                            start_position=start,
                            end_position=current_pos,
                            selected_text=text,
                            label=local,
                            meta=meta if meta else None,
                            is_editorial=True,
                        )
                    )
            else:
                _walk_inline(child)
            if child.tail:
                _emit(child.tail)

    # Prefer div with subtype=diplomatic; else use body (tei.xml has body > div > ab)
    div_diplo = None
    for div in body.iter(_ns("div")):
        if div.get("type") == "transcription" and div.get("subtype") == "diplomatic":
            div_diplo = div
            break
    search_root = div_diplo if div_diplo is not None else body

    for ab in search_root.iter(_ns("ab")):
        if ab.text:
            _emit(ab.text)
        for child in ab:
            if child.tag == _ns("lb"):
                # lb tail is the line text (may contain inline editorial elements as siblings)
                if child.tail:
                    _emit(child.tail)
            elif child.tag in (_ns("pb"),):
                # Skip pb, process its tail
                if child.tail:
                    _emit(child.tail)
            else:
                local = _local_name(child.tag)
                if local in EDITORIAL_ELEMENTS:
                    # Direct editorial child of ab: record span
                    text = _text_content(child)
                    if text:
                        start = current_pos
                        _emit(text)
                        meta = {}
                        if local == "add" and child.get("place"):
                            meta["place"] = child.get("place")
                        if local == "hi" and child.get("style"):
                            meta["style"] = child.get("style")
                        editorial.append(
                            TEIAnnotation(
                                start_position=start,
                                end_position=current_pos,
                                selected_text=text,
                                label=local,
                                meta=meta if meta else None,
                                is_editorial=True,
                            )
                        )
                else:
                    _walk_inline(child)
                if child.tail:
                    _emit(child.tail)
        parts.append("\n")
        current_pos += 1

    content = "".join(parts)
    # Fallback for standard TEI prose (body with div/p/head/lg/l/list/etc, no ab)
    if not content.strip():
        content = _text_content(search_root)
    # Adjust editorial positions: they were computed on raw content; strip removes leading whitespace
    if editorial:
        leading = len(content) - len(content.lstrip())
        for ann in editorial:
            ann.start_position -= leading
            ann.end_position -= leading
    content = content.strip()
    return content, editorial


def _text_from_diplomatic(body: ET.Element) -> str:
    """Extract plain text from diplomatic layer (ab, lb elements)."""
    content, _ = _text_and_editorial_from_diplomatic(body)
    return content


def _text_from_normalized(body: ET.Element) -> Optional[str]:
    """Extract plain text from normalized layer (div subtype=normalized, p elements)."""
    for div in body.iter(_ns("div")):
        if div.get("type") == "transcription" and div.get("subtype") == "normalized":
            return _text_content(div).strip() or None
    return None


def _text_from_segmented(body: ET.Element) -> Optional[str]:
    """Extract plain text from segmented layer (w elements, joined by space)."""
    for div in body.iter(_ns("div")):
        if div.get("type") == "transcription" and div.get("subtype") == "segmented":
            words = [w.text or "" for w in div.iter(_ns("w"))]
            return " ".join(words).strip() or None
    return None


def _text_and_annotations_from_annotated(
    body: ET.Element,
) -> tuple[Optional[str], List[TEIAnnotation]]:
    """Extract text and POS annotations from annotated layer.

    Inserts a newline after each <u> (utterance) so text is separated by segments.
    Annotation start/end positions account for these newlines so span addresses stay correct.
    """
    for div in body.iter(_ns("div")):
        if div.get("type") == "transcription" and div.get("subtype") == "annotated":
            # Build list of (w, add_newline_after): when <u> exists, add newline after last w of each <u>
            word_items: List[Tuple[ET.Element, bool]] = []
            u_elements = div.findall(f"./{_ns('u')}")
            if u_elements:
                for u in u_elements:
                    ws = list(u.iter(_ns("w")))
                    for w in ws:
                        word_items.append((w, w is ws[-1]))
            else:
                for w in div.iter(_ns("w")):
                    word_items.append((w, False))

            content_parts = []
            annotations = []
            current_pos = 0
            for w, add_newline_after in word_items:
                text = (w.text or "").strip()
                if text:
                    start = current_pos
                    end = current_pos + len(text)
                    content_parts.append(text)
                    current_pos = end  # no space between words (preserves source spacing, e.g. Tibetan)
                    lemma = w.get("lemma")
                    pos_tag = w.get("pos")
                    meta = {"lemma": lemma} if lemma else None
                    annotations.append(
                        TEIAnnotation(
                            start_position=start,
                            end_position=end,
                            selected_text=text,
                            label=pos_tag,
                            meta=meta,
                        )
                    )
                if add_newline_after:
                    content_parts.append("\n")
                    current_pos += 1
            content = "".join(content_parts).rstrip() if u_elements else "".join(content_parts).strip()
            return content, annotations
    return None, []


def _get_body(root: ET.Element) -> Optional[ET.Element]:
    """Get body element from TEI text."""
    text_elem = root.find(f".//{_ns('text')}/{_ns('body')}")
    if text_elem is not None:
        return text_elem
    # Some TEI may have body directly under text
    return root.find(f".//{_ns('body')}")


def parse_tei(content: str, filename: str = "") -> TEIParseResult:
    """Parse TEI XML content and extract title, text, and annotations.

    - POS annotations: from annotated layer (w elements with pos)
    - Editorial annotations: from diplomatic layer (add, unclear, hi, decoration)

    Prefers content in order: annotated > segmented > normalized > diplomatic.
    Editorial annotations use positions in the extracted content.
    """
    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        raise ValueError(f"Invalid XML: {e}") from e

    title = _extract_title(root)
    body = _get_body(root)
    if body is None:
        raise ValueError("TEI document has no body element")

    content = ""
    pos_annotations: List[TEIAnnotation] = []
    editorial_annotations: List[TEIAnnotation] = []

    # Try annotated layer first (gives content + POS annotations)
    ann_content, ann_annotations = _text_and_annotations_from_annotated(body)
    if ann_content:
        content = ann_content
        pos_annotations = ann_annotations

    # Fallbacks for content
    if not content:
        content = _text_from_segmented(body)
    if not content:
        content = _text_from_normalized(body)
    if not content:
        content, editorial_annotations = _text_and_editorial_from_diplomatic(body)

    if not content or not content.strip():
        raise ValueError("TEI document contains no extractable text content")

    # Editorial annotations only valid when content from diplomatic (positions match)
    # output_combined uses annotated layer - skip editorial to avoid position mismatch

    content = content.strip()

    # Always extract diplomatic layer when present (for storage in text.diplomatic_text)
    diplomatic_text: Optional[str] = None
    for div in body.iter(_ns("div")):
        if div.get("type") == "transcription" and div.get("subtype") == "diplomatic":
            raw = _text_from_diplomatic(body)
            diplomatic_text = raw.strip() if raw and raw.strip() else None
            break

    # Distinct values for annotation list merge (add-only on upload)
    pos_values: Optional[Set[str]] = None
    if pos_annotations:
        pos_values = {ann.label.strip() for ann in pos_annotations if ann.label and ann.label.strip()}
    editorial_labels_val: Optional[Set[str]] = None
    if editorial_annotations:
        editorial_labels_val = {ann.label.strip() for ann in editorial_annotations if ann.label and ann.label.strip()}

    return TEIParseResult(
        title=title,
        content=content,
        annotations=pos_annotations,
        editorial_annotations=editorial_annotations,
        source=filename or "TEI XML",
        diplomatic_text=diplomatic_text,
        pos_values=pos_values,
        editorial_labels=editorial_labels_val,
    )
