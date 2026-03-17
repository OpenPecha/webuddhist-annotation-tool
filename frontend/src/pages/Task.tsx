import { useState, useMemo, useEffect, useTransition } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAnnotationStore } from "@/store/annotation";
import { TextAnnotator } from "@/components/TextAnnotator";
import { useAnnotationFiltersStore } from "@/store/annotationFilters";
import { AnnotationSidebar } from "@/components/AnnotationSidebar/AnnotationSidebar";
import { AnnotationTypesFilter } from "@/components/AnnotationTypesFilter";
import Navbar from "@/components/Navbar";
import ActionButtons from "@/components/ActionButtons";
import { SkipConfirmationDialog } from "@/components/SkipConfirmationDialog";
import { DiplomaticTextPanel } from "@/components/DiplomaticTextPanel";
import { AnnotationColorSettings } from "@/components/AnnotationColorSettings";
import { TaskLoadingState, TaskErrorState } from "@/components/Task";
import { useAuth } from "@/auth/use-auth-hook";
import {
  useTextWithAnnotations,
  useRecentActivity,
  useAnnotationListHierarchical,
  useCurrentUser,
  useSoftDeleteMyText,
} from "@/hooks";
import {
  convertApiAnnotationsSync,
  getDisplayLabelForFilter,
  type Annotation,
} from "@/utils/annotationConverter";
import { useAnnotationOperations } from "@/hooks/useAnnotationOperations";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useAnnotationNavigation } from "@/hooks/useAnnotationNavigation";
import { exportAsJsonFile, exportAsTeiXmlFile } from "@/utils/exportAnnotation";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";

const Index = () => {
  const { textId } = useParams<{ textId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { data: currentUserData } = useCurrentUser();

  /** Pending while filter changes are applied (select all / deselect all / toggle type) */
  const [isFilterPending, startFilterTransition] = useTransition();

  // Parse textId early for all hooks
  const parsedTextId = textId ? parseInt(textId, 10) : undefined;
  const currentUserId = currentUser?.id ? parseInt(currentUser.id, 10) : null;
  const userRole = currentUserData?.role;

  // Global state from Zustand stores
  const { sidebarOpen, toggleSidebar } = useAnnotationStore();
  const {
    selectedAnnotationListType,
    selectedAnnotationTypes,
    setSelectedAnnotationTypes,
    addSelectedAnnotationTypes,
  } = useAnnotationFiltersStore();

  const [sidebarFilterOpen, setSidebarFilterOpen] = useState(true);
  const [diplomaticPanelOpen, setDiplomaticPanelOpen] = useState(false);
  const location = useLocation();
  const queryClient = useQueryClient();

  // UI-only selection state
  const [selectedText, setSelectedText] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);
  const [allAnnotationsAccepted, setAllAnnotationsAccepted] = useState(false);

  // Fetch text data with annotations
  const {
    data: textData,
    isLoading,
    isError,
    error,
  } = useTextWithAnnotations(parsedTextId || 0, !!parsedTextId && !isNaN(parsedTextId));

  // Fetch annotation list for validation
  const { data: annotationList } = useAnnotationListHierarchical({
    type_id: selectedAnnotationListType,
    enabled: !!selectedAnnotationListType,
  });

  // Fetch recent activity for acceptance status
  const { data: recentActivityData } = useRecentActivity(10);

  // Derive text content from data
  const text = textData?.content || "";
  const translation = textData?.translation || "";
  const hasTranslation = Boolean(translation && translation.trim().length > 0);
  const hasDiplomatic = Boolean(
    textData?.diplomatic_text != null && textData.diplomatic_text !== ""
  );

  // Check if this is a completed task
  const isCompletedTask = textData && (textData.status === "annotated" || textData.status === "reviewed");

  // Derive UI annotations directly from query data (no local duplication)
  const annotationsForUI: Annotation[] = useMemo(() => {
    return textData?.annotations ? convertApiAnnotationsSync(textData.annotations) : [];
  }, [textData]);

  /** All annotation filter keys (type|label) that appear in this text (for "all segments selected" check) */
  const annotationLabelsInText = useMemo(() => {
    const keys = new Set<string>();
    annotationsForUI.forEach((ann) => {
      const key = getDisplayLabelForFilter(ann);
      if (key) keys.add(key);
    });
    return keys;
  }, [annotationsForUI]);

  /** Editable only when every segment type present in the text is selected in the filter */
  const allSegmentsSelected =
    annotationLabelsInText.size === 0 ||
    [...annotationLabelsInText].every((l) => selectedAnnotationTypes.has(l));

  // Determine if text should be read-only
  const isReadOnly = allAnnotationsAccepted || !textData || !allSegmentsSelected;

  /**
   * Custom hook: Annotation CRUD operations
   * Handles creating, updating, deleting annotations with optimistic updates
   */
  const {
    addAnnotation: addAnnotationFn,
    applyAnnotationToAll,
    removeAnnotationFromAll,
    updateAnnotation,
    removeAnnotation,
    handleHeaderSelected,
    handleUpdateHeaderSpan,
    isCreatingAnnotation,
    isDeletingAnnotation,
    isUpdatingAnnotation,
    isBulkOperationPending,
  } = useAnnotationOperations(textId, text, currentUserId, annotationList);

  /**
   * Custom hook: Task lifecycle operations
   * Handles task submission, skipping, reverting, and undo
   */
  const {
    handleSubmitTask,
    handleSkipText,
    handleConfirmSkip,
    handleCancelSkip,
    handleRevertWork,
    handleUndoAnnotations,
    getUserAnnotationsCount,
    showSkipConfirmation,
    isSubmitting,
    isSkipping,
    isUndoing,
  } = useTaskOperations(parsedTextId, annotationsForUI, currentUserId, isCompletedTask || false);

  /**
   * Custom hook: Annotation navigation
   * Handles scrolling to annotations and URL-based navigation
   */
  const { textAnnotatorRef, highlightedAnnotationId, handleAnnotationClick } = useAnnotationNavigation(annotationsForUI);

  const softDeleteMutation = useSoftDeleteMyText({
    onSuccess: () => navigate("/"),
  });

  /**
   * Effect: Add annotation types from XML upload to selected filter so markings show
   */
  useEffect(() => {
    const types = (location.state as { annotationTypesToSelect?: string[] } | null)
      ?.annotationTypesToSelect;
    if (types?.length) {
      addSelectedAnnotationTypes(types);
    }
  }, [location.state, addSelectedAnnotationTypes]);

  /**
   * Effect: Check annotation acceptance status from recent activity
   */
  useEffect(() => {
    if (recentActivityData && textId) {
      const currentTextActivity = recentActivityData.find(
        (activity) => activity.text.id === parseInt(textId, 10)
      );
      if (currentTextActivity) {
        setAllAnnotationsAccepted(currentTextActivity.all_accepted);
      } else {
        setAllAnnotationsAccepted(false);
      }
    }
  }, [recentActivityData, textId]);

  /**
   * Wrapper for addAnnotation that handles selectedText state
   */
  const handleAddAnnotation = (type: string, name?: string, level?: string) => {
    if (!selectedText) return;
    addAnnotationFn(selectedText, type, name, level);
    setSelectedText(null);
  };

  /** On text select: always allow selection (for adding annotations). Text content editing is controlled by isReadOnly. */
  const handleTextSelect = (selection: { text: string; start: number; end: number } | null) => {
    setSelectedText(selection);
  };

  /**
   * Only show annotations when selected in the filter (no annotations by default).
   * Headers are shown only when "header" (or their display label) is selected.
   */
  const filteredAnnotations = useMemo(() => {
    if (selectedAnnotationTypes.size === 0) return [];
    return annotationsForUI.filter((ann) => {
      const filterKey = getDisplayLabelForFilter(ann);
      return filterKey ? selectedAnnotationTypes.has(filterKey) : false;
    });
  }, [annotationsForUI, selectedAnnotationTypes]);
  /**
   * Annotations without headers (for sidebar display)
   */
  const annotationsWithoutHeader = useMemo(() => {
    return filteredAnnotations.filter((ann) => ann.type !== "header");
  }, [filteredAnnotations]);
  const dbUserId = currentUserData?.id;
  const canDeleteMyText =
    !!parsedTextId &&
    !!textData &&
    dbUserId !== undefined &&
    dbUserId !== null &&
    textData.uploaded_by === dbUserId;
  const handleDeleteMyText = () => {
    if (!parsedTextId || !canDeleteMyText) return;
    if (!window.confirm(`Are you sure you want to delete "${textData?.title}"? This cannot be undone.`)) return;
    softDeleteMutation.mutate(parsedTextId);
  };

  /**
   * Handle export for regular users (JSON or TEI XML)
   */
  const handleExport = (format: "json" | "tei") => {
    if (!textData) return;
    if (format === "json") {
      exportAsJsonFile(textData);
    } else {
      exportAsTeiXmlFile(textData);
    }
  };

  // Loading state
  if (isLoading) {
    return <TaskLoadingState />;
  }

  // Error state
  if (isError) {
    return <TaskErrorState error={error} />;
  }

  // No data state
  if (!textData) {
    return <TaskErrorState error={new Error("No text data available")} />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <Navbar textTitle={textData?.title} />

      <div className="flex w-full gap-6 flex-1 px-6 mx-auto overflow-hidden">
        {/* Left: Filter + Main content */}
        <div className="flex flex-1 gap-4 min-w-0">
          {/* Filter: left of editor */}
          <div className="flex-shrink-0 mt-4 mb-4">
            <AnnotationTypesFilter
              isOpen={sidebarFilterOpen}
              onToggle={() => setSidebarFilterOpen((o) => !o)}
              annotations={annotationsForUI}
              loading={isFilterPending}
              selectedAnnotationTypes={selectedAnnotationTypes}
              onToggleAnnotationType={(displayLabel) => {
                startFilterTransition(() => {
                  const next = new Set(selectedAnnotationTypes);
                  if (next.has(displayLabel)) next.delete(displayLabel);
                  else next.add(displayLabel);
                  setSelectedAnnotationTypes(next);
                });
              }}
              onSelectAllAnnotationTypes={(displayLabels) => {
                startFilterTransition(() =>
                  setSelectedAnnotationTypes(new Set(displayLabels))
                );
              }}
              onDeselectAllAnnotationTypes={() => {
                startFilterTransition(() => setSelectedAnnotationTypes(new Set()));
              }}
              onSetSelectedAnnotationTypes={(set) => {
                startFilterTransition(() => setSelectedAnnotationTypes(set));
              }}
            />
          </div>

          {/* Main Content Area: Diplomatic panel (top) + Text Annotator */}
          <div
            className={`flex-1 flex flex-col gap-3 mt-4 mb-4 transition-all duration-300 ease-in-out min-w-0 ${
              sidebarOpen ? "mr-3" : "mr-0"
            }`}
            style={{
              marginRight: sidebarOpen ? "0" : "60px",
            }}
          >
            <DiplomaticTextPanel
              textId={parsedTextId}
              isVisible={diplomaticPanelOpen}
              onDiplomaticSaved={() => {
                if (parsedTextId != null) {
                  queryClient.invalidateQueries({
                    queryKey: queryKeys.texts.withAnnotations(parsedTextId),
                  });
                }
              }}
            />
          <div className="flex-1 min-h-0 mt-0 relative">
            {isFilterPending && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 rounded border border-gray-200"
                aria-busy="true"
                aria-live="polite"
              >
                <div className="flex flex-col items-center gap-2">
                  <AiOutlineLoading3Quarters className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm font-medium text-gray-700">
                    Updating annotations...
                  </p>
                </div>
              </div>
            )}
            <TextAnnotator
              ref={textAnnotatorRef}
              text={text}
              translation={translation}
              hasTranslation={hasTranslation}
              annotations={filteredAnnotations}
              selectedText={selectedText}
              onTextSelect={handleTextSelect}
              onAddAnnotation={handleAddAnnotation}
              onRemoveAnnotation={removeAnnotation}
              onUpdateAnnotation={updateAnnotation}
              onHeaderSelected={handleHeaderSelected}
              onUpdateHeaderSpan={handleUpdateHeaderSpan}
              readOnly={isReadOnly}
              isCreatingAnnotation={isCreatingAnnotation}
              isDeletingAnnotation={isDeletingAnnotation}
              isUpdatingAnnotation={isUpdatingAnnotation}
              highlightedAnnotationId={highlightedAnnotationId}
              textId={parsedTextId}
            />
          </div>
          </div>
        </div>

        {/* Right Sidebar: Action Buttons + Annotation List */}
        <div className="w-80 flex flex-col gap-4 h-[90vh] mt-4 mb-4 overflow-y-hidden">
          <ActionButtons
            annotations={annotationsForUI}
            onSubmitTask={handleSubmitTask}
            isSubmitting={isSubmitting}
            isCompletedTask={isCompletedTask}
            onSkipText={handleSkipText}
            isSkipping={isSkipping}
            isUndoing={isUndoing}
            onUndoAnnotations={handleUndoAnnotations}
            onRevertWork={handleRevertWork}
            onExport={handleExport}
            onToggleDiplomatic={() => setDiplomaticPanelOpen((prev) => !prev)}
            isDiplomaticVisible={diplomaticPanelOpen}
            hasDiplomatic={hasDiplomatic}
            onDeleteMyText={handleDeleteMyText}
            canDeleteMyText={canDeleteMyText}
            isDeletingText={softDeleteMutation.isPending}
            textData={textData}
            userRole={userRole}
            userAnnotationsCount={getUserAnnotationsCount()}
          />
          <AnnotationSidebar
            annotations={annotationsWithoutHeader}
            fullText={text}
            isBulkOperationPending={isCreatingAnnotation || isDeletingAnnotation || isBulkOperationPending}
            onRemoveAnnotation={removeAnnotation}
            onAnnotationClick={handleAnnotationClick}
            onApplyToAll={applyAnnotationToAll}
            onRemoveFromAll={removeAnnotationFromAll}
            isOpen={sidebarOpen}
            onToggle={toggleSidebar}
          />
        </div>
      </div>

      {/* Dialogs and Floating UI */}
      <SkipConfirmationDialog
        isOpen={showSkipConfirmation}
        onConfirm={handleConfirmSkip}
        onCancel={handleCancelSkip}
        textTitle={textData?.title}
        isSkipping={isSkipping}
      />

      {/* Floating annotation color settings */}
      <AnnotationColorSettings />
    </div>
  );
};

export default Index;
