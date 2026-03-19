import type { AnnotationResponse } from "@/api/types";
import type { AnnotationReviewResponse } from "@/api/reviews";
import { reviewApi } from "@/api/reviews";

/**
 * Annotation type used in the UI layer
 * Simplified from API response format for easier component consumption
 */
/**
 * Unique filter key for an annotation: "type|label".
 * Used so the same label under different annotation types is distinct.
 */
export const FILTER_KEY_SEP = "|";

export function getFilterKey(type: string, label: string | null | undefined): string {
  const t = type?.trim() || "";
  const l = label?.trim();
  if (!t) return "";
  return l ? `${t}${FILTER_KEY_SEP}${l}` : t;
}

/**
 * Get the display label for an annotation (e.g. for tooltips, sidebar).
 * Prefers name, then label, then type. No type prefix in the label.
 */
export function getAnnotationDisplayLabel(annotation: {
  type: string;
  label?: string | null;
  name?: string | null;
}): string {
  if (annotation.name?.trim()) return annotation.name.trim();
  if (annotation.label?.trim()) return annotation.label.trim();
  return annotation.type;
}

/** Normalize API or UI annotation to { type, label, name } for filter key */
function toFilterKeyInput(
  ann: { type?: string; annotation_type?: string; label?: string | null; name?: string | null }
): { type: string; label?: string | null } {
  return {
    type: ann.type ?? ann.annotation_type ?? "",
    label: ann.label,
  };
}

/**
 * Get the filter key for API or UI annotation (type|label).
 * Used for filter checkboxes and visibility so each (type, label) is one option.
 */
export function getDisplayLabelForFilter(
  ann: { type?: string; annotation_type?: string; label?: string | null; name?: string | null }
): string {
  const { type, label } = toFilterKeyInput(ann);
  return getFilterKey(type, label);
}

export type Annotation = {
  id: string;
  type: string;
  text: string;
  start: number;
  end: number;
  name?: string;
  label?: string;
  level?: "minor" | "major" | "critical";
  created_at?: string;
  annotator_id?: number;
  is_agreed?: boolean;
  reviews?: Array<{
    id: number;
    decision: "agree" | "disagree";
    comment?: string;
    reviewer_id: number;
    created_at: string;
  }>;
};

/**
 * Converts API annotation responses to UI annotation format
 * Fetches and attaches review data for each annotation
 * 
 * @param apiAnnotations - Array of annotations from API
 * @returns Promise resolving to array of UI-formatted annotations
 */
export const convertApiAnnotations = async (
  apiAnnotations: AnnotationResponse[]
): Promise<Annotation[]> => {
  const annotationsWithReviews = await Promise.all(
    apiAnnotations.map(async (ann) => {
      let reviews: AnnotationReviewResponse[] = [];
      try {
        reviews = await reviewApi.getAnnotationReviews(ann.id);
      } catch (error) {
        console.warn(
          `Failed to fetch reviews for annotation ${ann.id}:`,
          error
        );
        reviews = [];
      }

      return {
        id: ann.id.toString(),
        type: ann.annotation_type,
        text: ann.selected_text || "",
        start: ann.start_position,
        end: ann.end_position,
        name: ann.name,
        label: ann.label,
        level: ann.level,
        annotator_id: ann.annotator_id,
        is_agreed: ann.is_agreed,
        created_at: ann.created_at,
        reviews: reviews,
      };
    })
  );

  return annotationsWithReviews;
};

/**
 * Converts a single API annotation to UI format (without reviews)
 * Used for optimistic updates
 */
export const convertSingleAnnotation = (ann: AnnotationResponse): Annotation => {
  return {
    id: ann.id.toString(),
    type: ann.annotation_type,
    text: ann.selected_text || "",
    start: ann.start_position,
    end: ann.end_position,
    name: ann.name,
    label: ann.label,
    level: ann.level as "minor" | "major" | "critical" | undefined,
    annotator_id: ann.annotator_id,
    is_agreed: ann.is_agreed,
    created_at: ann.created_at,
    reviews: [],
  };
};

/**
 * Synchronous conversion of API annotations to UI annotations.
 * Does NOT fetch reviews; intended for render-time mapping or React Query select.
 */
export const convertApiAnnotationsSync = (
  apiAnnotations: AnnotationResponse[]
): Annotation[] => {
  return apiAnnotations.map((ann) => ({
    id: ann.id.toString(),
    type: ann.annotation_type,
    text: ann.selected_text || "",
    start: ann.start_position,
    end: ann.end_position,
    name: ann.name,
    label: ann.label,
    level: ann.level as "minor" | "major" | "critical" | undefined,
    annotator_id: ann.annotator_id,
    is_agreed: ann.is_agreed,
    created_at: ann.created_at,
    reviews: [],
  }));
};

