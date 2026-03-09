import { apiClient } from "./utils";

// Types matching the backend schemas
export interface AnnotationType {
  id: string;
  name: string;
  color?: string | null;
  description?: string;
  meta?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export const annotationTypeApi = {
  /**
   * Get all annotation types
   */
  getAll: async (params?: { skip?: number; limit?: number }): Promise<AnnotationType[]> => {
    return await apiClient.get<AnnotationType[]>(
      "/annotation-types/",
      params
    );
  },
};

