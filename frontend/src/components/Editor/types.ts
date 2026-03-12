import type { Annotation } from "@/pages/Task";

export interface EditorProps {
  text: string;
  annotations: Annotation[];
  selectedText: { text: string; start: number; end: number } | null;
  onTextSelect: (
    selection: { text: string; start: number; end: number } | null
  ) => void;
  onAddAnnotation: (type: string, name?: string, level?: string) => void;
  onRemoveAnnotation: (id: string) => void;
  onUpdateAnnotation?: (
    annotationId: string,
    newType: string,
    newText?: string,
    newLevel?: string
  ) => void;
  onHeaderSelected?: (selection: {
    text: string;
    start: number;
    end: number;
  }) => void;
  onUpdateHeaderSpan?: (
    headerId: string,
    newStart: number,
    newEnd: number
  ) => void;
  readOnly?: boolean;
  isCreatingAnnotation?: boolean;
  isDeletingAnnotation?: boolean;
  isUpdatingAnnotation?: boolean;
  highlightedAnnotationId?: string | null;
  hideScrollbar?: boolean;
}

export type ScrollToPositionOptions = {
  /** When false, only scroll into view without changing selection. Default true. */
  select?: boolean;
};

export type EditorRef = {
  scrollToPosition: (start: number, end: number, options?: ScrollToPositionOptions) => void;
};

export interface CurrentSelection {
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface BubbleMenuPosition {
  x: number;
  y: number;
  transformX: string;
}

export interface DeletePopupPosition {
  x: number;
  y: number;
}

export interface BubbleMenuProps {
  visible: boolean;
  position: BubbleMenuPosition;
  currentSelection: CurrentSelection | null;
  annotationText: string;
  selectedHeaderId: string;
  annotationLevel: string;
  annotations: Annotation[];
  isCreatingAnnotation: boolean;

  contextAnnotation?: Annotation; // The annotation being edited (if any)
  onAddAnnotation: (type: string, name?: string, level?: string) => void;
  onCancel: () => void;
  onAnnotationTextChange: (text: string) => void;
  onSelectedHeaderIdChange: (id: string) => void;
  onAnnotationLevelChange: (level: string) => void;
  onUpdateHeaderSpan: () => void;
}

export interface DeletePopupProps {
  visible: boolean;
  position: DeletePopupPosition;
  annotation: Annotation | null;
  isDeletingAnnotation: boolean;
  onDelete: () => void;
  onCancel: () => void;
}

export interface EditPopupProps {
  visible: boolean;
  position: DeletePopupPosition;
  annotation: Annotation | null;
  /** Full document content - used to derive selected text display (fixes XML encoding issues) */
  content?: string;
  isUpdatingAnnotation: boolean;
  onUpdate: (
    annotationId: string,
    newType: string,
    newText?: string,
    newLevel?: string
  ) => void;
  onDelete: () => void;
  onCancel: () => void;
}
