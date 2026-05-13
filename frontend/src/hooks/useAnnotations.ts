import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  annotationsApi,
  type CustomAnnotationLabelResponse,
} from "@/api/annotations";
import { queryKeys } from "@/constants/queryKeys";
import type {
  AnnotationResponse,
  AnnotationCreate,
  AnnotationUpdate,
  AnnotationFilters,
  AnnotationStats,
  ValidatePositionsRequest,
  ValidatePositionsResponse,
  DeleteMyAnnotationsResponse,
} from "@/api/types";

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get all annotations with optional filtering
 */
export const useAnnotations = (filters?: AnnotationFilters) => {
  return useQuery({
    queryKey: [...queryKeys.annotations.all, filters],
    queryFn: () => annotationsApi.getAnnotations(filters),
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get single annotation by ID
 */
export const useAnnotation = (id: number, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.annotations.detail(id),
    queryFn: () => annotationsApi.getAnnotation(id),
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get annotations by text ID
 */
export const useAnnotationsByText = (textId: number, enabled = true) => {
  return useQuery<AnnotationResponse[]>({
    queryKey: queryKeys.annotations.byText(textId),
    queryFn: () => annotationsApi.getAnnotationsByText(textId),
    enabled,
    staleTime: 1000 * 30, // 30 seconds - more frequent for active editing
    refetchOnWindowFocus: true,
  });
};

/**
 * Get annotations by type
 */
export const useAnnotationsByType = (
  annotationType: string,
  filters?: { skip?: number; limit?: number }
) => {
  return useQuery({
    queryKey: [...queryKeys.annotations.byType(annotationType), filters],
    queryFn: () => annotationsApi.getAnnotationsByType(annotationType, filters),
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get current user's annotations
 */
export const useMyAnnotations = (filters?: { skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: [...queryKeys.annotations.myAnnotations, filters],
    queryFn: () => annotationsApi.getMyAnnotations(filters),
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get annotation statistics
 */
export const useAnnotationStats = (textId?: number) => {
  return useQuery<AnnotationStats>({
    queryKey: queryKeys.annotations.stats(textId),
    queryFn: () => annotationsApi.getAnnotationStats(textId),
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get unique custom annotation labels used by users but missing from the canonical annotation list.
 */
export const useCustomAnnotationLabels = () => {
  return useQuery<CustomAnnotationLabelResponse[]>({
    queryKey: [...queryKeys.annotations.all, "custom-labels"],
    queryFn: () => annotationsApi.getCustomAnnotationLabels(),
    staleTime: 1000 * 60,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create new annotation
 */
export const useCreateAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AnnotationCreate) => annotationsApi.createAnnotation(data),
    onSuccess: (newAnnotation) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.annotations.all });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.annotations.byText(newAnnotation.text_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.texts.withAnnotations(newAnnotation.text_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.annotations.stats(newAnnotation.text_id) 
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotations.myAnnotations });
    },
  });
};

/**
 * Update annotation
 */
export const useUpdateAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AnnotationUpdate }) =>
      annotationsApi.updateAnnotation(id, data),
    onSuccess: (updatedAnnotation) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.annotations.detail(updatedAnnotation.id) 
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotations.all });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.annotations.byText(updatedAnnotation.text_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.texts.withAnnotations(updatedAnnotation.text_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.annotations.stats(updatedAnnotation.text_id) 
      });
    },
  });
};

/**
 * Delete annotation
 */
export const useDeleteAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annotationsApi.deleteAnnotation(id),
    onSuccess: () => {
      // Invalidate all annotation-related queries since we don't have text_id after deletion
      queryClient.invalidateQueries({ queryKey: queryKeys.annotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotations.stats() });
    },
  });
};

/**
 * Delete my annotations for a text
 */
export const useDeleteMyAnnotationsForText = () => {
  const queryClient = useQueryClient();
  return useMutation<DeleteMyAnnotationsResponse, Error, number>({
    mutationFn: (textId: number) => annotationsApi.deleteMyAnnotationsForText(textId),
    onSuccess: () => {
      // Invalidate all annotation-related queries since we don't have text_id after deletion
      queryClient.invalidateQueries({ queryKey: queryKeys.annotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotations.stats() });
    },
  });
};

/**
 * Validate annotation positions
 */
export const useValidatePositions = () => {
  return useMutation<ValidatePositionsResponse, Error, ValidatePositionsRequest>({
    mutationFn: (data: ValidatePositionsRequest) =>
      annotationsApi.validatePositions(data),
  });
};

