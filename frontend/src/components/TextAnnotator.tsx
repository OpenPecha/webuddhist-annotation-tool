import { useRef, useImperativeHandle, forwardRef } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Editor } from "./Editor";
import type { EditorRef } from "./Editor/types";
import type { Annotation } from "@/pages/Task";
import type { NavigationMode } from "@/store/annotation";
import { SearchComponent } from "./SearchComponent";
import { Button } from "@/components/ui/button";
import { IoEye, IoEyeOff } from "react-icons/io5";

interface TextAnnotatorProps {
  text: string;
  translation?: string;
  hasTranslation?: boolean;
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
    newText?: string
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
  annotationMode?: NavigationMode;
  textId?: number;
}

export type TextAnnotatorRef = {
  scrollToPosition: (start: number, end: number, options?: { select?: boolean }) => void;
};

export const TextAnnotator = forwardRef<TextAnnotatorRef, TextAnnotatorProps>(
  (
    {
      text,
      translation,
      hasTranslation = false,
      annotations,
      selectedText,
      onTextSelect,
      onAddAnnotation,
      onRemoveAnnotation,
      onUpdateAnnotation,
      onHeaderSelected,
      onUpdateHeaderSpan,
      readOnly = true,
      isCreatingAnnotation = false,
      isDeletingAnnotation = false,
      isUpdatingAnnotation = false,
      highlightedAnnotationId,
      annotationMode = "error-list",
      textId,
    },
    ref
  ) => {
    const editorRef = useRef<EditorRef>(null);
    const [showTranslation, setShowTranslation] = useLocalStorage(
      "showTranslation",
      true
    );

    useImperativeHandle(ref, () => ({
      scrollToPosition: (start: number, end: number, options?: { select?: boolean }) => {
        editorRef.current?.scrollToPosition(start, end, options);
      },
    }));

    const handleSearchResultSelect = (start: number, end: number) => {
      editorRef.current?.scrollToPosition(start, end);
    };

    const shouldShowSplitView =
      hasTranslation && translation && showTranslation;
    const textContent=text
    return (
      <div className="flex flex-col h-full">
        {/* Header with Search Bar and Translation Toggle */}
        <div className="border-b flex items-center justify-between gap-4">
          <div className="flex-1">
            <SearchComponent
              text={text}
              isVisible={true}
              onClose={() => {}} // No close functionality needed
              onResultSelect={handleSearchResultSelect}
              textId={textId}
            />
          </div>
          {hasTranslation && translation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTranslation(!showTranslation)}
              className="flex items-center gap-2 shrink-0"
            >
              {showTranslation ? (
                <>
                  <IoEyeOff className="w-4 h-4" />
                  Hide Original
                </>
              ) : (
                <>
                  <IoEye className="w-4 h-4" />
                  Show Original
                </>
              )}
            </Button>
          )}
        </div>

        {/* Content Area */}
        {shouldShowSplitView ? (
          // Split view: Original text (with annotations) on left, Translation on right
          <div className="flex flex-1 overflow-hidden">
            {/* Original Text with Annotations */}
            <div className="flex-1 border-r border-gray-200">
              <div className="p-2 bg-blue-50 border-b border-gray-200">
                <h3 className="text-sm font-medium text-blue-800">
                  Translation
                </h3>
              </div>
              <div className="h-full overflow-hidden">
                <Editor
                  ref={editorRef}
                  text={textContent}
                  annotations={annotations}
                  selectedText={selectedText}
                  onTextSelect={onTextSelect}
                  onAddAnnotation={onAddAnnotation}
                  onRemoveAnnotation={onRemoveAnnotation}
                  onUpdateAnnotation={onUpdateAnnotation}
                  onHeaderSelected={onHeaderSelected}
                  onUpdateHeaderSpan={onUpdateHeaderSpan}
                  readOnly={readOnly}
                  isCreatingAnnotation={isCreatingAnnotation}
                  isDeletingAnnotation={isDeletingAnnotation}
                  isUpdatingAnnotation={isUpdatingAnnotation}
                  highlightedAnnotationId={highlightedAnnotationId}
                  hideScrollbar={false}
                  annotationMode={annotationMode}
                />
              </div>
            </div>

            {/* Translation Text (Read-only) */}
            <div className="flex-1">
              <div className="p-2 bg-green-50 border-b border-gray-200">
                <h3 className="text-sm font-medium text-green-800">Original</h3>
              </div>
              <div className="h-full overflow-hidden">
                <Editor
                  ref={null}
                  text={translation}
                  annotations={[]} // No annotations on translation
                  selectedText={null}
                  onTextSelect={() => {}} // No selection on translation
                  onAddAnnotation={() => {}} // No annotation creation on translation
                  onRemoveAnnotation={() => {}} // No annotation removal on translation
                  onUpdateAnnotation={() => {}} // No annotation updates on translation
                  onHeaderSelected={() => {}}
                  onUpdateHeaderSpan={() => {}}
                  readOnly={true} // Always read-only for translation
                  isCreatingAnnotation={false}
                  isDeletingAnnotation={false}
                  highlightedAnnotationId={null}
                  hideScrollbar={false}
                />
              </div>
            </div>
          </div>
        ) : (
          // Single view: Just the original text (full width)
          <div className="flex-1 overflow-hidden">
            <Editor
              ref={editorRef}
              text={textContent}
              annotations={annotations}
              selectedText={selectedText}
              onTextSelect={onTextSelect}
              onAddAnnotation={onAddAnnotation}
              onRemoveAnnotation={onRemoveAnnotation}
              onUpdateAnnotation={onUpdateAnnotation}
              onHeaderSelected={onHeaderSelected}
              onUpdateHeaderSpan={onUpdateHeaderSpan}
              readOnly={readOnly}
              isCreatingAnnotation={isCreatingAnnotation}
              isDeletingAnnotation={isDeletingAnnotation}
              isUpdatingAnnotation={isUpdatingAnnotation}
              highlightedAnnotationId={highlightedAnnotationId}
              hideScrollbar={false}
              annotationMode={annotationMode}
            />
          </div>
        )}
      </div>
    );
  }
);

TextAnnotator.displayName = "TextAnnotator";
