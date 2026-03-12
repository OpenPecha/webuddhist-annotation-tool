import { EditorView, Decoration, WidgetType } from "@codemirror/view";
import { StateField, StateEffect } from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import {
  isStructuralAnnotationType,
  getStructuralAnnotationType,
} from "@/config/structural-annotations";
import { getAnnotationDisplayLabel } from "@/utils/annotationConverter";
import { sanitizeAnnotationTypeForClass } from "@/utils/annotationColorUtils";
import type { Annotation } from "@/pages/Task";

// Widget class for annotation labels
class AnnotationLabelWidget extends WidgetType {
  annotation: Annotation;
  titleText: string;
  isOptimistic: boolean;
  isHighlighted: boolean;

  constructor(
    annotation: Annotation,
    titleText: string,
    isOptimistic: boolean,
    isHighlighted: boolean = false
  ) {
    super();
    this.annotation = annotation;
    this.titleText = titleText;
    this.isOptimistic = isOptimistic;
    this.isHighlighted = isHighlighted;
  }

  toDOM() {
    const label = document.createElement("div");

    // Determine CSS class based on annotation type
    let levelClass: string;
    const isStructural = isStructuralAnnotationType(this.annotation.type);

    if (isStructural) {
      levelClass = `annotation-label-structural-${this.annotation.type}`;
    } else {
      levelClass = this.annotation.level
        ? `annotation-label-${this.annotation.level}`
        : "annotation-label-default";
    }

    const typeClass = isStructural
      ? ""
      : ` annotation-label-type-${sanitizeAnnotationTypeForClass(this.annotation.type)}`;

    label.className = `annotation-label ${levelClass}${typeClass} ${
      this.isOptimistic ? "annotation-label-optimistic" : ""
    } ${this.annotation.is_agreed ? "annotation-label-agreed" : ""} ${
      this.isHighlighted ? "annotation-label-highlighted" : ""
    }`;

    if (this.annotation.is_agreed) {
      // Create lock icon and text for agreed annotations
      const lockIcon = document.createElement("span");
      lockIcon.innerHTML = "🔒";
      lockIcon.style.marginRight = "4px";
      lockIcon.style.fontSize = "10px";

      const textSpan = document.createElement("span");
      textSpan.textContent = this.titleText;

      label.appendChild(lockIcon);
      label.appendChild(textSpan);

      // Add green styling for agreed annotations
      label.style.backgroundColor = "#dcfce7";
      label.style.color = "#15803d";
      label.style.border = "1px solid #22c55e";
      label.style.cursor = "default";
    } else {
      label.textContent = this.titleText;
      label.style.cursor = "pointer";

      // Apply structural annotation colors if it's a structural type
      if (isStructural) {
        const structuralType = getStructuralAnnotationType(
          this.annotation.type
        );
        if (structuralType) {
          label.style.backgroundColor = structuralType.backgroundColor;
          label.style.color = structuralType.color;
          label.style.border = `1px solid ${structuralType.borderColor}`;
        }
      }
    }

    label.setAttribute("data-annotation-id", this.annotation.id);
    label.setAttribute("data-annotation-type", this.annotation.type);
    label.setAttribute(
      "data-annotation-level",
      this.annotation.level || "default"
    );

    // Add click handler for annotation selection/deletion only for non-agreed annotations
    if (!this.annotation.is_agreed) {
      label.addEventListener("click", (e) => {
        e.stopPropagation();
        // Dispatch custom event for annotation interaction
        const customEvent = new CustomEvent("annotation-label-click", {
          detail: { annotation: this.annotation },
          bubbles: true,
        });
        label.dispatchEvent(customEvent);
      });
    }

    return label;
  }

  eq(other: AnnotationLabelWidget) {
    return (
      this.annotation.id === other.annotation.id &&
      this.titleText === other.titleText &&
      this.isOptimistic === other.isOptimistic &&
      this.isHighlighted === other.isHighlighted
    );
  }
}

// Create state effects for managing annotations
export const addAnnotationEffect = StateEffect.define<Annotation>();
export const clearAnnotationsEffect = StateEffect.define();
export const setHighlightedAnnotationEffect = StateEffect.define<
  string | null
>();

// State structure to hold both decorations and highlighted annotation ID
interface AnnotationFieldState {
  decorations: DecorationSet;
  highlightedAnnotationId: string | null;
}

// Create decoration field for annotations
export const annotationField = StateField.define<AnnotationFieldState>({
  create() {
    return {
      decorations: Decoration.none,
      highlightedAnnotationId: null,
    };
  },
  update(state, tr) {
    let decorations = state.decorations.map(tr.changes);
    let highlightedAnnotationId = state.highlightedAnnotationId;

    // Batch all decoration additions to ensure proper sorting
    const toAdd: Array<{ from: number; to: number; decoration: Decoration }> =
      [];

    for (const effect of tr.effects) {
      if (effect.is(setHighlightedAnnotationEffect)) {
        highlightedAnnotationId = effect.value;
        // When highlighting changes, we need to rebuild all decorations
        decorations = Decoration.none;
        // The existing annotations will be re-added by the annotation effects
      } else if (effect.is(addAnnotationEffect)) {
        const annotation = effect.value;
        const isOptimistic = annotation.id.startsWith("temp-");
        const isHighlighted = highlightedAnnotationId === annotation.id;
        // Get display name - use helper so pos shows value (e.g. v.past) not "pos"
        const titleText = getAnnotationDisplayLabel(annotation);

        // Create mark decoration for highlighting the text
        const isStructural = isStructuralAnnotationType(annotation.type);
        let levelClass: string;

        if (isStructural) {
          levelClass = `annotation-structural-${annotation.type}`;
        } else {
          levelClass = annotation.level
            ? `annotation-${annotation.level}`
            : "annotation-default";
        }

        const typeClass = isStructural
          ? ""
          : ` annotation-type-${sanitizeAnnotationTypeForClass(annotation.type)}`;

        const markDecoration = Decoration.mark({
          class: `${levelClass}${typeClass} ${
            isOptimistic ? "annotation-optimistic" : ""
          } ${annotation.is_agreed ? "annotation-agreed" : ""} ${
            isHighlighted ? "annotation-highlighted" : ""
          }`,
          attributes: {
            title: annotation.is_agreed
              ? `🔒 ${titleText} (Agreed by reviewer)`
              : titleText,
            "data-annotation-id": annotation.id,
            "data-annotation-type": annotation.type,
            "data-annotation-level": annotation.level || "default",
            "data-annotation-agreed": annotation.is_agreed ? "true" : "false",
          },
        });

        // Create widget decoration for the label at the start position
        const labelWidget = new AnnotationLabelWidget(
          annotation,
          titleText,
          isOptimistic,
          isHighlighted
        );
        const labelDecoration = Decoration.widget({
          widget: labelWidget,
          side: -1, // Place before the position
          block: false,
        });

        // Add to batch - widget first, then mark (skip mark for position-only annotations; CodeMirror rejects empty marks)
        toAdd.push({
          from: annotation.start,
          to: annotation.start,
          decoration: labelDecoration,
        });
        if (annotation.start < annotation.end) {
          toAdd.push({
            from: annotation.start,
            to: annotation.end,
            decoration: markDecoration,
          });
        }
      } else if (effect.is(clearAnnotationsEffect)) {
        decorations = Decoration.none;
      }
    }

    // Sort all decorations by position and side, then add them
    if (toAdd.length > 0) {
      const sortedRanges = toAdd
        .sort((a, b) => {
          // Sort by 'from' position first
          if (a.from !== b.from) {
            return a.from - b.from;
          }
          // For same position, sort by side (widget side comes first)
          const aSide = a.decoration.spec?.side ?? 0;
          const bSide = b.decoration.spec?.side ?? 0;
          return aSide - bSide;
        })
        .map((item) => item.decoration.range(item.from, item.to));

      decorations = decorations.update({
        add: sortedRanges,
      });
    }

    return {
      decorations,
      highlightedAnnotationId,
    };
  },
  provide: (f) => EditorView.decorations.from(f, (state) => state.decorations),
});
