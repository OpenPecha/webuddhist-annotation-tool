"""Diplomatic-only TEI XML parser.

Two modes:
- extract_raw_text_section: Extract raw XML from first <text> to </text> (inclusive).
  Used when uploading diplomatic: save that fragment to DB without parsing.
- parse_diplomatic_from_tei: Extract plain text from <text><body><div> (legacy).
  Kept for any callers that need parsed plain text.
"""

import re
import xml.etree.ElementTree as ET
from typing import Optional

TEI_NS = "http://www.tei-c.org/ns/1.0"


def extract_raw_text_section(content: str) -> Optional[str]:
    """Extract the raw XML fragment from the first <text> to its matching </text> (inclusive).

    Does not parse the content; returns the substring as-is for storage in the database.
    Handles <text> or <text ...> with attributes. Finds matching </text> by counting nesting.
    """
    start_tag = re.search(r"<text(?:\s|>)", content)
    if not start_tag:
        return None
    start = start_tag.start()
    # Find end of opening tag (first '>' after start)
    open_end = content.index(">", start) + 1
    depth = 1
    i = open_end
    while i < len(content) and depth > 0:
        if content[i : i + 2] == "</":
            end_close = content.find(">", i + 2)
            if end_close == -1:
                break
            tag_name = content[i + 2 : end_close].strip().split()[-1].split("}")[-1].split(":")[-1]
            if tag_name == "text":
                depth -= 1
                if depth == 0:
                    return content[start : end_close + 1]
            i = end_close + 1
            continue
        if content[i] == "<" and i + 1 < len(content) and content[i + 1] not in ("!", "?", "/"):
            # Start of an opening tag; find tag name
            tag_end = content.find(">", i + 1)
            if tag_end == -1:
                break
            name_part = content[i + 1 : tag_end].strip().split()
            tag_name = (name_part[0].split("}")[-1].split(":")[-1] if name_part else "").rstrip("/")
            if tag_name == "text":
                depth += 1
            i = tag_end + 1
            continue
        i += 1
    return None


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


def _get_body(root: ET.Element) -> Optional[ET.Element]:
    """Find TEI body element."""
    return root.find(f".//{_ns('body')}")


def _extract_text_from_div(div: ET.Element) -> str:
    """Extract plain text from body/div (ab/lb/pb and inline elements like decoration). Preserves line breaks."""
    parts: list[str] = []
    for ab in div.iter(_ns("ab")):
        if ab.text:
            parts.append(ab.text)
        for child in ab:
            if child.tag == _ns("lb") and child.tail:
                parts.append(child.tail)
            elif child.tag == _ns("pb") and child.tail:
                parts.append(child.tail)
            else:
                parts.append(_text_content(child))
                if child.tail:
                    parts.append(child.tail)
        parts.append("\n")
    content = "".join(parts).strip()
    if content:
        return content
    return _text_content(div).strip()


def parse_diplomatic_from_tei(content: str) -> Optional[str]:
    """Extract diplomatic text from TEI XML.

    Uses <text><body><div> content only (first div under body, or body if no div).
    Does not look for type="transcription" subtype="diplomatic".
    Does not use or depend on utils.tei_parser.
    """
    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        raise ValueError(f"Invalid XML: {e}") from e

    body = _get_body(root)
    if body is None:
        raise ValueError("TEI document has no body element")

    content_root = body.find(_ns("div"))
    if content_root is None:
        content_root = body
    raw = _extract_text_from_div(content_root)
    return raw.strip() if raw and raw.strip() else None
