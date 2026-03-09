/**
 * Sanitize annotation type name for use as CSS class (e.g. "Error typology" -> "error-typology").
 * Used for per-annotation-type color classes in the editor.
 */
export function sanitizeAnnotationTypeForClass(typeName: string): string {
  return typeName
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "") || "default";
}
