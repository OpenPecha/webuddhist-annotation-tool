import { apiClient } from "./utils";
import type {
  TextResponse,
  TextCreate,
  TextUpdate,
  TextFilters,
  TextWithAnnotations,
  TextStats,
  SearchParams,
  TextStatus,
  TaskSubmissionResponse,
  UserStats,
  RejectedTextWithDetails,
  AdminTextStatistics,
  RecentActivityWithReviewCounts,
  DiplomaticTextResponse,
  TextPermissionUpsertRequest,
  TextPermissionResponse,
} from "./types";

// Text API client
export const textApi = {
  // Get all texts with optional filtering
  getTexts: async (filters: TextFilters = {}): Promise<TextResponse[]> => {
    return apiClient.get<TextResponse[]>("/texts", filters);
  },

  // Get single text by ID
  getText: async (id: number): Promise<TextResponse> => {
    return apiClient.get<TextResponse>(`/texts/${id}`);
  },

  // Get text with annotations
  getTextWithAnnotations: async (id: number): Promise<TextWithAnnotations> => {
    return apiClient.get<TextWithAnnotations>(`/texts/${id}/with-annotations`);
  },

  // Get diplomatic transcription text (from TEI upload)
  getDiplomaticText: async (id: number): Promise<DiplomaticTextResponse> => {
    return apiClient.get<DiplomaticTextResponse>(`/texts/${id}/diplomatic`);
  },

  // Parse TEI XML file with diplomatic-only parser; returns { diplomatic_text }. Does not use full upload parser.
  parseDiplomaticFromTei: async (
    file: File
  ): Promise<DiplomaticTextResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<DiplomaticTextResponse>(
      "/texts/parse-diplomatic",
      formData
    );
  },

  // Create new text
  createText: async (data: TextCreate): Promise<TextResponse> => {
    return apiClient.post<TextResponse>("/texts", data);
  },

  // Upload text file. For TEI XML, annotation_type_id is optional (derived from file).
  uploadTextFile: async (
    file: File,
    language: string,
    annotation_type_id?: string | null
  ): Promise<TextResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);
    if (annotation_type_id != null && annotation_type_id !== "") {
      formData.append("annotation_type_id", annotation_type_id);
    }
    return apiClient.post<TextResponse>("/texts/upload-file", formData);
  },

  // Update text
  updateText: async (id: number, data: TextUpdate): Promise<TextResponse> => {
    return apiClient.put<TextResponse>(`/texts/${id}`, data);
  },

  // Update text status
  updateTextStatus: async (
    id: number,
    status: TextStatus
  ): Promise<TextResponse> => {
    return apiClient.put<TextResponse>(`/texts/${id}/status`, status);
  },

  // Delete text (admin only - hard delete)
  deleteText: async (id: number): Promise<void> => {
    return apiClient.delete<void>(`/texts/${id}`);
  },

  // Soft delete a text that the current user uploaded
  softDeleteMyText: async (id: number): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/texts/${id}/my-text`);
  },

  // Get texts for annotation (status: initialized)
  getTextsForAnnotation: async (
    filters: { skip?: number; limit?: number } = {}
  ): Promise<TextResponse[]> => {
    return apiClient.get<TextResponse[]>("/texts/for-annotation", filters);
  },

  // Start work - find work in progress or assign new text
  startWork: async (): Promise<TextResponse> => {
    return apiClient.post<TextResponse>("/texts/start-work");
  },

  // Skip current text and get next available text
  skipText: async (): Promise<TextResponse> => {
    return apiClient.post<TextResponse>("/texts/skip-text");
  },

  // Get texts that the current user has rejected/skipped
  getMyRejectedTexts: async (): Promise<RejectedTextWithDetails[]> => {
    return apiClient.get<RejectedTextWithDetails[]>("/texts/my-rejected-texts");
  },

  // Get comprehensive text statistics for admins
  getAdminTextStatistics: async (): Promise<AdminTextStatistics> => {
    return apiClient.get<AdminTextStatistics>("/texts/admin/text-statistics");
  },

  // Cancel work on a specific text
  cancelWork: async (id: number): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>(`/texts/${id}/cancel-work`);
  },

  // Revert user work and make text available for others (edit mode skip)
  revertWork: async (id: number): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>(`/texts/${id}/revert-work`);
  },

  // Get all texts that the current user is working on
  getMyWorkInProgress: async (
    filters: { skip?: number; limit?: number } = {}
  ): Promise<TextResponse[]> => {
    return apiClient.get<TextResponse[]>("/texts/my-work-in-progress", filters);
  },

  getSharedTexts: async (
    filters: { skip?: number; limit?: number } = {}
  ): Promise<TextResponse[]> => {
    return apiClient.get<TextResponse[]>("/texts/shared-with-me", filters);
  },

  // Submit task - mark text as annotated and get next task (for annotators)
  submitTask: async (id: number): Promise<TaskSubmissionResponse> => {
    return apiClient.post<TaskSubmissionResponse>(`/texts/${id}/submit-task`);
  },

  // Update completed task - for editing previously submitted work
  updateTask: async (id: number): Promise<TextResponse> => {
    return apiClient.post<TextResponse>(`/texts/${id}/update-task`);
  },

  // Get texts for review (status: annotated)
  getTextsForReview: async (
    filters: { skip?: number; limit?: number } = {}
  ): Promise<TextResponse[]> => {
    return apiClient.get<TextResponse[]>("/texts/for-review", filters);
  },

  // Search texts
  searchTexts: async (params: SearchParams): Promise<TextResponse[]> => {
    return apiClient.get<TextResponse[]>("/texts/search", params);
  },

  // Get text statistics
  getTextStats: async (): Promise<TextStats> => {
    return apiClient.get<TextStats>("/texts/stats");
  },

  // Get recent activity for current user
  getRecentActivity: async (
    limit: number = 10
  ): Promise<RecentActivityWithReviewCounts[]> => {
    return apiClient.get<RecentActivityWithReviewCounts[]>(
      "/texts/recent-activity",
      { limit }
    );
  },

  // Get user statistics
  getUserStats: async (): Promise<UserStats> => {
    return apiClient.get<UserStats>("/texts/user-stats");
  },

  // Cancel work with revert and skip - combines deleting user annotations and skipping text
  cancelWorkWithRevertAndSkip: async (
    textId: number
  ): Promise<{ message: string; nextText?: TextResponse }> => {
    // First revert the user's work (delete annotations)
    await apiClient.post<{ message: string }>(`/texts/${textId}/revert-work`);

    // Then skip the text (add to rejected list and get next text)
    const nextText = await apiClient.post<TextResponse>("/texts/skip-text");

    return {
      message: "Work cancelled, annotations deleted, and text skipped",
      nextText,
    };
  },

  listTextPermissions: async (textId: number): Promise<TextPermissionResponse[]> => {
    return apiClient.get<TextPermissionResponse[]>(`/texts/${textId}/permissions`);
  },

  upsertTextPermission: async (
    textId: number,
    data: TextPermissionUpsertRequest
  ): Promise<TextPermissionResponse> => {
    return apiClient.post<TextPermissionResponse>(`/texts/${textId}/permissions`, data);
  },

  deleteTextPermission: async (
    textId: number,
    granteeUserId: number
  ): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/texts/${textId}/permissions/${granteeUserId}`);
  },
};
