import { apiClient } from "./utils";
import type {
  AnnotationResponse,
  AnnotationCreate,
  AnnotationUpdate,
  AnnotationFilters,
  AnnotationStats,
  ValidatePositionsRequest,
  ValidatePositionsResponse,
  DeleteMyAnnotationsResponse,
  BulkCreateAnnotationsRequest,
  BulkCreateAnnotationsResponse,
  BulkDeleteByCriteriaRequest,
  BulkDeleteAnnotationsResponse,
} from "./types";

export interface CustomAnnotationLabelResponse {
  label: string;
  annotation_type_id?: string;
  annotation_type_name?: string;
  usage_count: number;
  user_count: number;
  text_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

// Annotations API client
export const annotationsApi = {
  // Get all annotations with optional filtering
  getAnnotations: async (
    filters: AnnotationFilters = {}
  ): Promise<AnnotationResponse[]> => {
    return apiClient.get<AnnotationResponse[]>("/annotations", filters);
  },

  // Get single annotation by ID
  getAnnotation: async (id: number): Promise<AnnotationResponse> => {
    return apiClient.get<AnnotationResponse>(`/annotations/${id}`);
  },

  // Create new annotation
  createAnnotation: async (
    data: AnnotationCreate
  ): Promise<AnnotationResponse> => {
    return apiClient.post<AnnotationResponse>("/annotations", data);
  },

  // Update annotation
  updateAnnotation: async (
    id: number,
    data: AnnotationUpdate
  ): Promise<AnnotationResponse> => {
    return apiClient.put<AnnotationResponse>(`/annotations/${id}`, data);
  },

  // Delete annotation
  deleteAnnotation: async (id: number): Promise<void> => {
    return apiClient.delete<void>(`/annotations/${id}`);
  },

  // Delete my annotations for a text
  deleteMyAnnotationsForText: async (textId: number): Promise<DeleteMyAnnotationsResponse> => {
    return apiClient.delete<DeleteMyAnnotationsResponse>(`/annotations/text/${textId}/my-annotations`);
  },
  // Get current user's annotations
  getMyAnnotations: async (
    filters: { skip?: number; limit?: number } = {}
  ): Promise<AnnotationResponse[]> => {
    return apiClient.get<AnnotationResponse[]>(
      "/annotations/my-annotations",
      filters
    );
  },

  // Get annotations by text ID
  getAnnotationsByText: async (
    textId: number
  ): Promise<AnnotationResponse[]> => {
    return apiClient.get<AnnotationResponse[]>(`/annotations/text/${textId}`);
  },

  // Get annotations by type
  getAnnotationsByType: async (
    annotationType: string,
    filters: { skip?: number; limit?: number } = {}
  ): Promise<AnnotationResponse[]> => {
    return apiClient.get<AnnotationResponse[]>(
      `/annotations/type/${annotationType}`,
      filters
    );
  },

  // Get annotation statistics
  getAnnotationStats: async (textId?: number): Promise<AnnotationStats> => {
    const params = textId ? { text_id: textId } : {};
    return apiClient.get<AnnotationStats>("/annotations/stats", params);
  },

  // Get unique custom annotation labels used by users but missing from the canonical annotation list
  getCustomAnnotationLabels: async (): Promise<CustomAnnotationLabelResponse[]> => {
    return apiClient.get<CustomAnnotationLabelResponse[]>("/annotations/custom-labels");
  },

  // Validate annotation positions
  validatePositions: async (
    data: ValidatePositionsRequest
  ): Promise<ValidatePositionsResponse> => {
    return apiClient.post<ValidatePositionsResponse>(
      "/annotations/validate-positions",
      data
    );
  },

  // Bulk create (apply to all)
  bulkCreateAnnotations: async (
    data: BulkCreateAnnotationsRequest
  ): Promise<BulkCreateAnnotationsResponse> => {
    return apiClient.post<BulkCreateAnnotationsResponse>(
      "/annotations/bulk-create",
      data
    );
  },

  // Bulk delete (delete from all)
  bulkDeleteAnnotations: async (
    data: BulkDeleteByCriteriaRequest
  ): Promise<BulkDeleteAnnotationsResponse> => {
    return apiClient.post<BulkDeleteAnnotationsResponse>(
      "/annotations/bulk-delete",
      data
    );
  },
};
