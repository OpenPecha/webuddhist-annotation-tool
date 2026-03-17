import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAnnotationStore } from "@/store/annotation";
import { useAnnotationFiltersStore } from "@/store/annotationFilters";
import type { AnnotationCreate, AnnotationResponse, TextWithAnnotations } from "@/api/types";
import {
  useCreateAnnotation,
  useUpdateAnnotation,
  useDeleteAnnotation,
  useAnnotationTypes,
} from "@/hooks";
import {
  extractLeafNodes,
  isValidAnnotationType,
  type AnnotationOption,
} from "@/config/annotation-options";
import { useCustomAnnotationsStore } from "@/store/customAnnotations";
import { TOAST_MESSAGES } from "@/constants/taskConstants";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { getDisplayLabelForFilter, type Annotation } from "@/utils/annotationConverter";

/**
 * Custom hook that encapsulates all annotation CRUD operations
 * Handles optimistic updates, validation, and error handling
 * 
 * @param annotations - Current annotations array
 * @param setAnnotations - Function to update annotations
 * @param textId - ID of the current text
 * @param text - Full text content for header span extraction
 * @param currentUserId - ID of current user for ownership checks
 * @param annotationList - Hierarchical annotation list for validation
 */
export const useAnnotationOperations = (
  textId: string | undefined,
  text: string,
  currentUserId: number | null,
  annotationList: any // TODO: Type this properly
) => {
  const { toast } = useToast();
  const {
    selectedAnnotationTypes,
    setSelectedAnnotationTypes,
    selectedAnnotationListType,
  } = useAnnotationFiltersStore();
  const { getCustomOptions } = useCustomAnnotationsStore();
  const queryClient = useQueryClient();
  const { data: annotationTypes = [] } = useAnnotationTypes();

  const [pendingHeader, setPendingHeader] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);

  // Mutations
  const createAnnotationMutation = useCreateAnnotation();
  const updateAnnotationMutation = useUpdateAnnotation();
  const deleteAnnotationMutation = useDeleteAnnotation();

  /**
   * Validates annotation type against current navigation mode.
   * For error-list: type is annotation type name (e.g. "pos"); must be a known type from API.
   */
  const validateAnnotationType = useCallback(
    async (type: string): Promise<boolean> => {
      const currentMode = useAnnotationStore.getState().currentNavigationMode;

      // Position-only types (line-break, page-break) are valid regardless of mode
      if (type === "line-break" || type === "page-break") return true;

      if (currentMode === "table-of-contents") {
        const { STRUCTURAL_ANNOTATION_TYPES } = await import(
          "@/config/structural-annotations"
        );
        return (
          STRUCTURAL_ANNOTATION_TYPES.some((t) => t.id === type) ||
          type === "header"
        );
      }

      if (type === "header") return true;
      const isKnownType = annotationTypes.some((t) => t.name === type);
      if (isKnownType) return true;

      const apiOptions = extractLeafNodes(annotationList?.categories || [], 0);
      const customOptions: AnnotationOption[] = selectedAnnotationListType
        ? getCustomOptions(selectedAnnotationListType)
        : [];
      const allOptions = [...apiOptions, ...customOptions];
      return isValidAnnotationType({ options: allOptions }, type);
    },
    [annotationList, selectedAnnotationListType, getCustomOptions, annotationTypes]
  );

  /**
   * Automatically checks annotation type in filter
   */
  const autoCheckAnnotationType = useCallback((annotationType: string) => {
    if (annotationType && !selectedAnnotationTypes.has(annotationType)) {
      const newSelectedTypes = new Set(selectedAnnotationTypes);
      newSelectedTypes.add(annotationType);
      setSelectedAnnotationTypes(newSelectedTypes);
    }
  }, [selectedAnnotationTypes, setSelectedAnnotationTypes]);

  /**
   * Adds a new annotation with optimistic update
   */
  const addAnnotation = useCallback(async (
    selectedText: { text: string; start: number; end: number },
    type: string,
    name?: string,
    level?: string
  ) => {
    if (!textId) return;

    // Validate annotation type
    const isValidType = await validateAnnotationType(type);
    if (!isValidType) {
      toast({
        title: TOAST_MESSAGES.INVALID_TYPE,
        description: "Invalid annotation type.",
      });
      return;
    }

    const textIdNumber = parseInt(textId, 10);
    if (isNaN(textIdNumber)) {
      toast({
        title: TOAST_MESSAGES.INVALID_TYPE,
        description: "Invalid text ID. Cannot create annotation.",
      });
      return;
    }

    // Optimistic add to cache of text-with-annotations
    const cacheKey = queryKeys.texts.withAnnotations(textIdNumber);
    const previous = queryClient.getQueryData<TextWithAnnotations>(cacheKey);
    const labelValue = name?.trim() ? name : type;
    const tempApiAnnotation: AnnotationResponse = {
      id: -Math.floor(Math.random() * 1_000_000),
      text_id: textIdNumber,
      annotation_type: type,
      start_position: selectedText.start,
      end_position: selectedText.end,
      selected_text: selectedText.text,
      confidence: 1.0,
      label: labelValue,
      name: name,
      level: level as any,
      meta: {},
      annotator_id: currentUserId || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_agreed: false,
    };

    if (previous) {
      queryClient.setQueryData<TextWithAnnotations>(cacheKey, {
        ...previous,
        annotations: [...previous.annotations, tempApiAnnotation],
      });
    }

    toast({
      title: TOAST_MESSAGES.CREATING_ANNOTATION,
      description: `Adding ${type} annotation`,
    });

    // Create annotation data for API (type = annotation_type, name = label)
    const annotationData: AnnotationCreate = {
      text_id: textIdNumber,
      annotation_type: type,
      start_position: selectedText.start,
      end_position: selectedText.end,
      selected_text: selectedText.text,
      confidence: 1.0,
      label: labelValue,
      name: name,
      level: level as "minor" | "major" | "critical" | undefined,
      meta: {},
    };

    // Save to database
    createAnnotationMutation.mutate(annotationData, {
      onSuccess: (data) => {
        // Replace optimistic annotation in cache with server one
        const current = queryClient.getQueryData<TextWithAnnotations>(cacheKey);
        if (current) {
          queryClient.setQueryData<TextWithAnnotations>(cacheKey, {
            ...current,
            annotations: current.annotations
              .filter((ann) => ann.id !== tempApiAnnotation.id)
              .concat(data),
          });
        }

        const filterKey = getDisplayLabelForFilter(data);
        if (filterKey) autoCheckAnnotationType(filterKey);

        toast({
          title: TOAST_MESSAGES.ANNOTATION_CREATED,
          description: `${data.annotation_type} annotation saved to database`,
        });
      },
      onError: (error) => {
        // Rollback cache
        if (previous) {
          queryClient.setQueryData<TextWithAnnotations>(cacheKey, previous);
        }
        toast({
          title: TOAST_MESSAGES.ANNOTATION_CREATE_FAILED,
          description: error instanceof Error ? error.message : "Failed to save annotation",
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: cacheKey });
      },
    });
  }, [textId, validateAnnotationType, currentUserId, toast, createAnnotationMutation, autoCheckAnnotationType, queryClient]);

  /**
   * Find all non-overlapping occurrences of search in text.
   */
  const findAllOccurrences = useCallback((fullText: string, search: string): { start: number; end: number }[] => {
    if (!search) return [];
    const spans: { start: number; end: number }[] = [];
    let start = 0;
    while (true) {
      const idx = fullText.indexOf(search, start);
      if (idx === -1) break;
      spans.push({ start: idx, end: idx + search.length });
      start = idx + search.length;
    }
    return spans;
  }, []);

  /**
   * Apply the same annotation (type, name, level) to all other occurrences of the annotation's text in the document.
   * Skips spans that already have an annotation with the same type and label.
   */
  const applyAnnotationToAll = useCallback(async (annotation: Annotation) => {
    if (!textId) return;
    const textIdNumber = parseInt(textId, 10);
    if (isNaN(textIdNumber)) return;

    const isValidType = await validateAnnotationType(annotation.type);
    if (!isValidType) {
      toast({
        title: TOAST_MESSAGES.INVALID_TYPE,
        description: "Invalid annotation type.",
      });
      return;
    }

    const cacheKey = queryKeys.texts.withAnnotations(textIdNumber);
    const cached = queryClient.getQueryData<TextWithAnnotations>(cacheKey);
    const existingApi = cached?.annotations ?? [];
    const targetKey = getDisplayLabelForFilter(annotation);

    const occurrences = findAllOccurrences(text, annotation.text);
    const toCreate = occurrences.filter(({ start, end }) => {
      const alreadyHasSame = existingApi.some(
        (a) =>
          getDisplayLabelForFilter(a) === targetKey &&
          a.start_position === start &&
          a.end_position === end
      );
      return !alreadyHasSame;
    });

    if (toCreate.length === 0) {
      toast({
        title: "Apply to all",
        description: "No other occurrences to annotate (all are already annotated or none found).",
      });
      return;
    }

    const labelValue = annotation.name?.trim() ?? annotation.label ?? annotation.type;
    const createDataList: AnnotationCreate[] = toCreate.map(({ start, end }) => ({
      text_id: textIdNumber,
      annotation_type: annotation.type,
      start_position: start,
      end_position: end,
      selected_text: annotation.text,
      confidence: 1.0,
      label: labelValue,
      name: annotation.name,
      level: annotation.level as "minor" | "major" | "critical" | undefined,
      meta: {},
    }));

    toast({
      title: "Applying to all",
      description: `Adding annotation to ${toCreate.length} occurrence(s)...`,
    });

    try {
      await Promise.all(
        createDataList.map((data) => createAnnotationMutation.mutateAsync(data))
      );
      queryClient.invalidateQueries({ queryKey: cacheKey });
      const filterKey = getDisplayLabelForFilter(annotation);
      if (filterKey) autoCheckAnnotationType(filterKey);
      toast({
        title: TOAST_MESSAGES.ANNOTATION_CREATED,
        description: `Applied to ${toCreate.length} occurrence(s).`,
      });
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: cacheKey });
      toast({
        title: TOAST_MESSAGES.ANNOTATION_CREATE_FAILED,
        description: error instanceof Error ? error.message : "Failed to apply to all occurrences",
      });
    }
  }, [textId, text, validateAnnotationType, toast, createAnnotationMutation, queryClient, findAllOccurrences, autoCheckAnnotationType]);

  /**
   * Update annotation in place via PUT (label, name, level).
   * Keeps the same record; no delete+create.
   */
  const updateAnnotation = useCallback(async (
    annotationId: string,
    newType: string,
    newText?: string,
    newLevel?: string
  ) => {
    const textIdNumber = textId ? parseInt(textId, 10) : NaN;
    const cacheKey = queryKeys.texts.withAnnotations(textIdNumber);
    const current = queryClient.getQueryData<TextWithAnnotations>(cacheKey);
    const annotation = current?.annotations.find((ann) => ann.id.toString() === annotationId);

    if (annotation?.is_agreed) {
      toast({
        title: TOAST_MESSAGES.CANNOT_EDIT_AGREED,
        description: "This annotation has been agreed upon by a reviewer and cannot be edited.",
      });
      return;
    }

    const annotationIdNumber = parseInt(annotationId, 10);
    if (isNaN(annotationIdNumber)) {
      toast({
        title: TOAST_MESSAGES.INVALID_TYPE,
        description: "Invalid annotation ID. Cannot update annotation.",
      });
      return;
    }

    // Skip type validation for update: EditPopup already restricts to valid options for this annotation's list.
    if (!newType?.trim()) {
      toast({
        title: TOAST_MESSAGES.INVALID_TYPE,
        description: "Please select a type.",
      });
      return;
    }

    const validLevels = ["minor", "major", "critical"] as const;
    const levelValue = newLevel && validLevels.includes(newLevel as typeof validLevels[number])
      ? (newLevel as "minor" | "major" | "critical")
      : undefined;

    const updateData = {
      label: newType,
      name: newText,
      ...(levelValue !== undefined && { level: levelValue }),
    };

    const previous = current ? { ...current } : undefined;
    if (current && annotation) {
      queryClient.setQueryData<TextWithAnnotations>(cacheKey, {
        ...current,
        annotations: current.annotations.map((ann) =>
          ann.id === annotationIdNumber
            ? { ...ann, label: newType, name: newText, level: levelValue }
            : ann
        ),
      });
    }

    updateAnnotationMutation.mutate(
      { id: annotationIdNumber, data: updateData },
      {
        onSuccess: (data) => {
          const currentAfter = queryClient.getQueryData<TextWithAnnotations>(cacheKey);
          if (currentAfter) {
            queryClient.setQueryData<TextWithAnnotations>(cacheKey, {
              ...currentAfter,
              annotations: currentAfter.annotations.map((ann) =>
                ann.id === annotationIdNumber ? data : ann
              ),
            });
          }
          const displayLabel = getDisplayLabelForFilter(data);
          if (displayLabel) autoCheckAnnotationType(displayLabel);
          toast({
            title: TOAST_MESSAGES.ANNOTATION_UPDATED,
            description: "Annotation updated successfully",
          });
        },
        onError: (error) => {
          if (previous) {
            queryClient.setQueryData<TextWithAnnotations>(cacheKey, previous);
          }
          toast({
            title: TOAST_MESSAGES.ANNOTATION_UPDATE_FAILED,
            description: error instanceof Error ? error.message : "Failed to update annotation",
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: cacheKey });
        },
      }
    );
  }, [textId, toast, updateAnnotationMutation, autoCheckAnnotationType, queryClient]);

  /**
   * Removes an annotation
   */
  const removeAnnotation = useCallback((id: string) => {
    // Check if annotation is agreed upon
    const textIdNumber = textId ? parseInt(textId, 10) : NaN;
    const cacheKey = queryKeys.texts.withAnnotations(textIdNumber);
    const current = queryClient.getQueryData<TextWithAnnotations>(cacheKey);
    const annotation = current?.annotations.find((ann) => ann.id.toString() === id);
    if (annotation?.is_agreed) {
      toast({
        title: TOAST_MESSAGES.CANNOT_DELETE_AGREED,
        description: "This annotation has been agreed upon by a reviewer and cannot be deleted.",
      });
      return;
    }

    const annotationIdNumber = parseInt(id, 10);
    if (isNaN(annotationIdNumber)) {
      toast({
        title: TOAST_MESSAGES.INVALID_TYPE,
        description: "Invalid annotation ID. Cannot delete annotation.",
      });
      return;
    }

    // Optimistic removal in cache
    const previous = current ? { ...current } : undefined;
    if (current) {
      queryClient.setQueryData<TextWithAnnotations>(cacheKey, {
        ...current,
        annotations: current.annotations.filter((ann) => ann.id !== annotationIdNumber),
      });
    }

    // Delete from database
    deleteAnnotationMutation.mutate(annotationIdNumber, {
      onSuccess: () => {
        toast({
          title: TOAST_MESSAGES.ANNOTATION_DELETED,
          description: "Annotation removed from database",
        });
      },
      onError: (error) => {
        // Restore on error
        if (previous) {
          queryClient.setQueryData<TextWithAnnotations>(cacheKey, previous);
        }

        const errorMessage = error instanceof Error && error.message.includes("agreed upon")
          ? "This annotation has been agreed upon by a reviewer and cannot be deleted."
          : error instanceof Error ? error.message : "Failed to delete annotation";

        toast({
          title: TOAST_MESSAGES.CANNOT_DELETE_AGREED,
          description: errorMessage,
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: cacheKey });
        queryClient.invalidateQueries({ queryKey: queryKeys.annotations.byText(textIdNumber) });
      },
    });
  }, [textId, toast, deleteAnnotationMutation, queryClient]);

  /**
   * Handler for header selection (triggers name input)
   */
  const handleHeaderSelected = useCallback((selection: {
    text: string;
    start: number;
    end: number;
  }) => {
    setPendingHeader(selection);
  }, []);

  /**
   * Submits header with custom name
   */
  const handleHeaderNameSubmit = useCallback((name: string) => {
    if (!pendingHeader || !textId) return;

    const textIdNumber = parseInt(textId, 10);
    if (isNaN(textIdNumber)) {
      toast({
        title: TOAST_MESSAGES.INVALID_TYPE,
        description: "Invalid text ID. Cannot create annotation.",
      });
      return;
    }

    const cacheKey = queryKeys.texts.withAnnotations(textIdNumber);
    const previous = queryClient.getQueryData<TextWithAnnotations>(cacheKey);
    const tempApiAnnotation: AnnotationResponse = {
      id: -Math.floor(Math.random() * 1_000_000),
      text_id: textIdNumber,
      annotation_type: "header",
      start_position: pendingHeader.start,
      end_position: pendingHeader.end,
      selected_text: pendingHeader.text,
      confidence: 1.0,
      label: "header",
      name: name,
      level: undefined,
      meta: {},
      annotator_id: currentUserId || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_agreed: false,
    };

    if (previous) {
      queryClient.setQueryData<TextWithAnnotations>(cacheKey, {
        ...previous,
        annotations: [...previous.annotations, tempApiAnnotation],
      });
    }

    toast({
      title: TOAST_MESSAGES.CREATING_HEADER,
      description: `Adding header "${name}"`,
    });

    const annotationData: AnnotationCreate = {
      text_id: textIdNumber,
      annotation_type: "header",
      start_position: pendingHeader.start,
      end_position: pendingHeader.end,
      selected_text: pendingHeader.text,
      confidence: 1.0,
      label: "header",
      name: name,
      meta: {},
    };

    createAnnotationMutation.mutate(annotationData, {
      onSuccess: (data) => {
        const current = queryClient.getQueryData<TextWithAnnotations>(cacheKey);
        if (current) {
          queryClient.setQueryData<TextWithAnnotations>(cacheKey, {
            ...current,
            annotations: current.annotations
              .filter((ann) => ann.id !== tempApiAnnotation.id)
              .concat(data),
          });
        }

        const filterKey = getDisplayLabelForFilter(data);
        if (filterKey) autoCheckAnnotationType(filterKey);

        toast({
          title: TOAST_MESSAGES.ANNOTATION_CREATED,
          description: `${data.annotation_type} annotation saved to database`,
        });
      },
      onError: (error) => {
        if (previous) {
          queryClient.setQueryData<TextWithAnnotations>(cacheKey, previous);
        }
        toast({
          title: TOAST_MESSAGES.ANNOTATION_CREATE_FAILED,
          description: error instanceof Error ? error.message : "Failed to save annotation",
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: cacheKey });
      },
    });
    setPendingHeader(null);
  }, [pendingHeader, textId, currentUserId, queryClient, toast, createAnnotationMutation, autoCheckAnnotationType]);

  /**
   * Cancels header creation
   */
  const handleHeaderNameCancel = useCallback(() => {
    setPendingHeader(null);
  }, []);

  /**
   * Updates header span (start/end positions)
   */
  const handleUpdateHeaderSpan = useCallback((
    headerId: string,
    newStart: number,
    newEnd: number
  ) => {
    const textIdNumber = textId ? parseInt(textId, 10) : NaN;
    const cacheKey = queryKeys.texts.withAnnotations(textIdNumber);
    const current = queryClient.getQueryData<TextWithAnnotations>(cacheKey);
    const existingHeader = current?.annotations.find(
      (ann) => ann.id.toString() === headerId && ann.annotation_type === "header"
    );

    if (!existingHeader) {
      toast({
        title: TOAST_MESSAGES.HEADER_NOT_FOUND,
        description: "Could not find the header to update.",
      });
      return;
    }

    // Check if annotation is agreed upon
    if (existingHeader.is_agreed) {
      toast({
        title: TOAST_MESSAGES.CANNOT_EDIT_AGREED,
        description: "This annotation has been agreed upon by a reviewer and cannot be edited.",
      });
      return;
    }

    const headerIdNumber = parseInt(headerId, 10);
    if (isNaN(headerIdNumber)) {
      toast({
        title: TOAST_MESSAGES.INVALID_TYPE,
        description: "Invalid header ID. Cannot update header.",
      });
      return;
    }

    const newTextVal = text.substring(newStart, newEnd);

    // Optimistic update in cache
    const previous = current ? { ...current } : undefined;
    if (current) {
      queryClient.setQueryData<TextWithAnnotations>(cacheKey, {
        ...current,
        annotations: current.annotations.map((ann) =>
          ann.id.toString() === headerId
            ? { ...ann, start_position: newStart, end_position: newEnd, selected_text: newTextVal }
            : ann
        ),
      });
    }

    toast({
      title: TOAST_MESSAGES.HEADER_UPDATED,
      description: `Updating header "${existingHeader.name || existingHeader.selected_text || ""}" span...`,
    });

    // Update in database
    updateAnnotationMutation.mutate(
      {
        id: headerIdNumber,
        data: {
          start_position: newStart,
          end_position: newEnd,
          selected_text: newTextVal,
        },
      },
      {
        onSuccess: (data) => {
          const currentAfter = queryClient.getQueryData<TextWithAnnotations>(cacheKey);
          if (currentAfter) {
            queryClient.setQueryData<TextWithAnnotations>(cacheKey, {
              ...currentAfter,
              annotations: currentAfter.annotations.map((ann) =>
                ann.id === headerIdNumber ? data : ann
              ),
            });
          }

          toast({
            title: TOAST_MESSAGES.HEADER_UPDATED,
            description: `Header "${data.name || data.selected_text || ""}" span updated successfully`,
          });
        },
        onError: (error) => {
          // Rollback on error
          if (previous) {
            queryClient.setQueryData<TextWithAnnotations>(cacheKey, previous);
          }
          toast({
            title: TOAST_MESSAGES.ANNOTATION_UPDATE_FAILED,
            description: error instanceof Error ? error.message : "Failed to update header span",
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: cacheKey });
        },
      }
    );
  }, [textId, text, queryClient, toast, updateAnnotationMutation]);

  return {
    // Functions
    addAnnotation,
    applyAnnotationToAll,
    updateAnnotation,
    removeAnnotation,
    handleHeaderSelected,
    handleHeaderNameSubmit,
    handleHeaderNameCancel,
    handleUpdateHeaderSpan,
    
    // State
    pendingHeader,
    
    // Loading states
    isCreatingAnnotation: createAnnotationMutation.isPending,
    isDeletingAnnotation: deleteAnnotationMutation.isPending,
    isUpdatingAnnotation: updateAnnotationMutation.isPending,
  };
};

