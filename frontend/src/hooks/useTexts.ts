import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { textApi } from "@/api/text";
import { queryKeys } from "@/constants/queryKeys";
import { toast } from "sonner";
import type {
  TextResponse,
  TextCreate,
  TextUpdate,
  TextFilters,
  TextWithAnnotations,
  TextStats,
  SearchParams,
  TaskSubmissionResponse,
  UserStats,
  RejectedTextWithDetails,
  AdminTextStatistics,
  RecentActivityWithReviewCounts,
  TextStatus,
  TextPermissionResponse,
  TextPermissionUpsertRequest,
} from "@/api/types";
import { useAnnotationFiltersStore } from "@/store/annotationFilters";
// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get all texts with optional filtering
 */
export const useTexts = (filters?: TextFilters) => {
  return useQuery({
    queryKey: [...queryKeys.texts.all, filters],
    queryFn: () => textApi.getTexts(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get single text by ID
 */
export const useText = (id: number, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.texts.detail(id),
    queryFn: () => textApi.getText(id),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get text with annotations
 */
export const useTextWithAnnotations = (id: number, enabled = true) => {
  const { setSelectedAnnotationListType } = useAnnotationFiltersStore();
  return useQuery<TextWithAnnotations>({
    queryKey: queryKeys.texts.withAnnotations(id),
    queryFn: async () => {
      const data = await textApi.getTextWithAnnotations(id);
      setSelectedAnnotationListType(data?.annotation_type_id || "");
      return data;
    },
    enabled,
    staleTime: 1000 * 30, // 30 seconds - more frequent updates for active editing
    refetchOnWindowFocus: true,
  });
};

/**
 * Get texts available for annotation (status: initialized)
 */
export const useTextsForAnnotation = (filters?: { skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: [...queryKeys.texts.forAnnotation, filters],
    queryFn: () => textApi.getTextsForAnnotation(filters),
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get texts available for review (status: annotated)
 */
export const useTextsForReview = (filters?: { skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: [...queryKeys.texts.forReview, filters],
    queryFn: () => textApi.getTextsForReview(filters),
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get current user's work in progress
 */
export const useMyWorkInProgress = (filters?: { skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: [...queryKeys.texts.myWorkInProgress, filters],
    queryFn: () => textApi.getMyWorkInProgress(filters),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

/**
 * Get current user's rejected/skipped texts
 */
export const useMyRejectedTexts = () => {
  return useQuery<RejectedTextWithDetails[]>({
    queryKey: queryKeys.texts.myRejectedTexts,
    queryFn: () => textApi.getMyRejectedTexts(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get recent activity for current user
 */
export const useRecentActivity = (limit = 10) => {
  return useQuery<RecentActivityWithReviewCounts[]>({
    queryKey: queryKeys.texts.recentActivity(limit),
    queryFn: () => textApi.getRecentActivity(limit),
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get text statistics
 */
export const useTextStats = () => {
  return useQuery<TextStats>({
    queryKey: queryKeys.texts.stats,
    queryFn: () => textApi.getTextStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get admin text statistics
 */
export const useAdminTextStatistics = () => {
  return useQuery<AdminTextStatistics>({
    queryKey: queryKeys.texts.adminStats,
    queryFn: () => textApi.getAdminTextStatistics(),
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get user statistics
 */
export const useUserStats = () => {
  return useQuery<UserStats>({
    queryKey: queryKeys.users.stats,
    queryFn: () => textApi.getUserStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Search texts
 */
export const useSearchTexts = (params: SearchParams) => {
  return useQuery({
    queryKey: queryKeys.texts.search(params.q),
    queryFn: () => textApi.searchTexts(params),
    enabled: params.q.length > 0,
    staleTime: 1000 * 60, // 1 minute
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create new text
 */
export const useCreateText = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TextCreate) => textApi.createText(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
    },
  });
};

/**
 * Update text
 */
export const useUpdateText = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TextUpdate }) =>
      textApi.updateText(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.withAnnotations(id) });
    },
  });
};

/**
 * Update text status
 */
export const useUpdateTextStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TextStatus }) =>
      textApi.updateTextStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
    },
  });
};

/**
 * Delete text (admin only - hard delete)
 */
export const useDeleteText = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => textApi.deleteText(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
    },
  });
};

/**
 * Soft delete a text that the current user uploaded
 */
export const useSoftDeleteMyText = (options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => textApi.softDeleteMyText(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.myWorkInProgress });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.forAnnotation });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      toast.success("Text deleted", {
        description: "Your uploaded text has been deleted",
      });
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("Delete failed", {
        description: error.message || "Failed to delete text",
      });
      options?.onError?.(error);
    },
  });
};

interface UploadTextFileVariables {
  file: File;
  language: string;
  annotation_type_id?: string | null;
}

interface UseUploadTextFileOptions {
  onSuccess?: (data: TextResponse, variables: UploadTextFileVariables) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

/**
 * Upload text file
 */
export const useUploadTextFile = (options?: UseUploadTextFileOptions) => {
  const queryClient = useQueryClient();
  const { showToast = true } = options || {};

  return useMutation({
    mutationFn: ({ file, language, annotation_type_id }: UploadTextFileVariables) =>
      textApi.uploadTextFile(file, language, annotation_type_id),
    onSuccess: (data: TextResponse, variables: UploadTextFileVariables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.myWorkInProgress });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.forAnnotation });

      if (showToast) {
        toast.success("File uploaded successfully!", {
          description: `"${data.title}" is ready for annotation`,
        });
      }

      options?.onSuccess?.(data, variables);
    },
    onError: (error: Error) => {
      if (showToast) {
        toast.error("Upload failed", {
          description: error.message || "Please try again",
        });
      }

      options?.onError?.(error);
    },
  });
};

/**
 * Start work on a text (finds work in progress or assigns new text)
 */
export const useStartWork = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => textApi.startWork(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.myWorkInProgress });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.forAnnotation });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
    },
  });
};

/**
 * Skip current text and get next available text
 */
export const useSkipText = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => textApi.skipText(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.myWorkInProgress });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.myRejectedTexts });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.forAnnotation });
    },
  });
};

/**
 * Cancel work on a specific text
 */
export const useCancelWork = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => textApi.cancelWork(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.myWorkInProgress });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.forAnnotation });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
    },
  });
};

/**
 * Revert user work (delete annotations and make text available)
 */
export const useRevertWork = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => textApi.revertWork(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.withAnnotations(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotations.byText(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.myWorkInProgress });
    },
  });
};

/**
 * Submit task (mark text as annotated and get next task)
 */
export const useSubmitTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => textApi.submitTask(id),
    onSuccess: (data: TaskSubmissionResponse) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.detail(data.submitted_task.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.myWorkInProgress });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.recentActivity() });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.forReview });
    },
  });
};

/**
 * Update completed task (edit previously submitted work)
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => textApi.updateTask(id),
    onSuccess: (data: TextResponse) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.recentActivity() });
    },
  });
};

/**
 * Cancel work with revert and skip (combines deleting annotations and skipping)
 */
export const useCancelWorkWithRevertAndSkip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (textId: number) => textApi.cancelWorkWithRevertAndSkip(textId),
    onSuccess: (_, textId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.detail(textId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.withAnnotations(textId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotations.byText(textId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.myWorkInProgress });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.myRejectedTexts });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.forAnnotation });
    },
  });
};

export const useTextPermissions = (textId: number, enabled = true) => {
  return useQuery<TextPermissionResponse[]>({
    queryKey: [...queryKeys.texts.detail(textId), "permissions"],
    queryFn: () => textApi.listTextPermissions(textId),
    enabled: enabled && !!textId,
    staleTime: 1000 * 30,
  });
};

export const useUpsertTextPermission = (textId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TextPermissionUpsertRequest) =>
      textApi.upsertTextPermission(textId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.texts.detail(textId), "permissions"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.myWorkInProgress });
    },
  });
};

export const useDeleteTextPermission = (textId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (granteeUserId: number) =>
      textApi.deleteTextPermission(textId, granteeUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.texts.detail(textId), "permissions"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.myWorkInProgress });
    },
  });
};

