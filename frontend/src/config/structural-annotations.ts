export interface StructuralAnnotationType {
  id: string;
  name: string;
  description: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  icon?: string;
  examples?: string[];
}

export const STRUCTURAL_ANNOTATION_TYPES: StructuralAnnotationType[] = [
  {
    id: "header",
    name: "Header",
    description: "Document structure headers (chapters, sections, subsections)",
    color: "#1f2937", // gray-800
    backgroundColor: "#f3f4f6", // gray-100
    borderColor: "#9ca3af", // gray-400
    icon: "📑",
    examples: [
      "Chapter 1: Introduction",
      "Section 2.1: Methodology",
      "Conclusion",
    ],
  },
  {
    id: "translator",
    name: "Translator",
    description: "Information about the translator or translation note",
    color: "#059669", // emerald-600
    backgroundColor: "#d1fae5", // emerald-100
    borderColor: "#34d399", // emerald-400
    icon: "🌐",
    examples: [
      "Translated by John Smith",
      "Translation note: This term has no direct equivalent",
      "Translator's comment",
    ],
  },
  {
    id: "topic",
    name: "Topic",
    description: "Main topics or themes discussed in the text",
    color: "#7c3aed", // violet-600
    backgroundColor: "#ede9fe", // violet-100
    borderColor: "#a78bfa", // violet-400
    icon: "🎯",
    examples: [
      "Buddhism philosophy",
      "Meditation practices",
      "Historical context",
    ],
  },
  {
    id: "author",
    name: "Author",
    description: "Original author attribution or authorship notes",
    color: "#dc2626", // red-600
    backgroundColor: "#fee2e2", // red-100
    borderColor: "#f87171", // red-400
    icon: "✍️",
    examples: [
      "Written by Nagarjuna",
      "Author's note",
      "Original composition by",
    ],
  },

  {
    id: "citation",
    name: "Citation",
    description: "References to other texts or sources",
    color: "#7c2d12", // amber-800
    backgroundColor: "#fef3c7", // amber-100
    borderColor: "#fcd34d", // amber-300
    icon: "📖",
    examples: [
      "Madhyamaka Karika verse 24.18",
      "Referenced in the Lotus Sutra",
      "See also Chapter 3",
    ],
  },
  {
    id: "line-break",
    name: "Line break",
    description: "Structural line break (position marker between characters)",
    color: "#475569", // slate-600
    backgroundColor: "#e2e8f0", // slate-200
    borderColor: "#94a3b8", // slate-400
    icon: "↵",
    examples: ["Line break here"],
  },
  {
    id: "page-break",
    name: "Page break",
    description: "Page break or folio boundary (position marker)",
    color: "#334155", // slate-700
    backgroundColor: "#cbd5e1", // slate-300
    borderColor: "#64748b", // slate-500
    icon: "📄",
    examples: ["Page break", "New folio"],
  },
];

/** Structural types that are inserted at a cursor position (no text selection). */
export const POSITION_STRUCTURAL_TYPE_IDS = ["line-break", "page-break"];

export const getStructuralAnnotationType = (
  id: string
): StructuralAnnotationType | undefined => {
  return STRUCTURAL_ANNOTATION_TYPES.find((type) => type.id === id);
};

export const getStructuralAnnotationTypeByName = (
  name: string
): StructuralAnnotationType | undefined => {
  return STRUCTURAL_ANNOTATION_TYPES.find((type) => type.name === name);
};

// Utility function to check if an annotation type is structural
export const isStructuralAnnotationType = (annotationType: string): boolean => {
  return STRUCTURAL_ANNOTATION_TYPES.some(
    (type) => type.id === annotationType || type.name === annotationType
  );
};
