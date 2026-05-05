import { apiClient } from "./utils";

// Types matching the backend schemas
export interface AnnotationListUploadResponse {
  success: boolean;
  message: string;
  total_records_created: number;
  record_ids: string[];
  root_type: string;
}

export interface CategoryOutput {
  id?: string;
  name: string;
  description?: string;
  level?: number;
  parent?: string;
  mnemonic?: string;
  examples?: string[];
  notes?: string;
  subcategories?: CategoryOutput[];
}

export interface HierarchicalJSONOutput {
  version?: string;
  title: string;
  description?: string;
  copyright?: string;
  categories: CategoryOutput[];
}

export interface AnnotationListResponse {
  id: string;
  type?: string;
  type_id?: string;
  title: string;
  level?: string;
  parent_id?: string;
  description?: string;
  created_by?: string;
  meta?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface AnnotationListCreate {
  title: string;
  type?: string;
  type_id?: string;
  level?: string;
  parent_id?: string;
  description?: string;
  meta?: Record<string, any>;
}

export interface AnnotationListUpdate {
  title?: string;
  level?: string;
  parent_id?: string;
  description?: string;
  meta?: Record<string, any>;
}

export interface AnnotationListFilters {
  title?: string;
  type?: string;
  created_by?: string;
  created_at?: string;
  skip?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
}

export const annotationListApi = {
  /**
   * Upload a JSON file with hierarchical annotation list
   */
  uploadFile: async (file: File): Promise<AnnotationListUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    
    return await apiClient.post<AnnotationListUploadResponse>(
      "/annotation-lists/upload",
      formData
    );
  },

  /**
   * Get annotation lists by type in hierarchical format
   */
  getByTypeHierarchical: async (type_id: string): Promise<HierarchicalJSONOutput> => {
    return await apiClient.get<HierarchicalJSONOutput>(
      `/annotation-lists/type/${encodeURIComponent(type_id)}`
    );
  },

  getAll: async (params?: AnnotationListFilters): Promise<AnnotationListResponse[]> => {
    return await apiClient.get<AnnotationListResponse[]>(
      `/annotation-lists/`,
      params
    );
  },

  /**
   * Delete all annotation lists by type
   */
  deleteByType: async (type_id: string): Promise<{ success: boolean; message: string; deleted_count: number }> => {
    return await apiClient.delete(
      `/annotation-lists/type/${encodeURIComponent(type_id)}`
    );
  },

  /**
   * Helper function to validate file type
   */
  validateFileType: (file: File): boolean => {
    return file.name.endsWith(".json");
  },

  /**
   * Helper function to read and validate JSON structure
   */
  validateJsonStructure: async (file: File): Promise<{ valid: boolean; error?: string }> => {
    try {
      const content = await file.text();
      const parsed = JSON.parse(content);

      // Check for required fields
      if (!parsed.title || typeof parsed.title !== "string") {
        return { valid: false, error: 'Missing or invalid "title" field' };
      }

      if (!parsed.categories || !Array.isArray(parsed.categories)) {
        return { valid: false, error: 'Missing or invalid "categories" array' };
      }

      if (parsed.categories.length === 0) {
        return { valid: false, error: "Categories array is empty" };
      }

      // Validate first category has required fields
      const firstCategory = parsed.categories[0];
      if (!firstCategory.name) {
        return { valid: false, error: 'Categories must have a "name" field' };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid JSON format",
      };
    }
  },

  /**
   * Helper function to format file size
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  /**
   * Helper function to count total items in hierarchy
   */
  countHierarchyItems: (categories: CategoryOutput[]): number => {
    let count = categories.length;
    categories.forEach(cat => {
      if (cat.subcategories) {
        count += annotationListApi.countHierarchyItems(cat.subcategories);
      }
    });
    return count;
  },

  /**
   * Create a new annotation list item
   */
  createItem: async (item: AnnotationListCreate): Promise<AnnotationListResponse> => {
    return await apiClient.post<AnnotationListResponse>("/annotation-lists/", item);
  },

  /**
   * Update an annotation list item
   */
  updateItem: async (itemId: string, item: AnnotationListUpdate): Promise<AnnotationListResponse> => {
    return await apiClient.put<AnnotationListResponse>(`/annotation-lists/${encodeURIComponent(itemId)}`, item);
  },

  /**
   * Delete an annotation list item
   */
  deleteItem: async (itemId: string): Promise<{ success: boolean; message: string }> => {
    return await apiClient.delete(`/annotation-lists/${encodeURIComponent(itemId)}`);
  },

  /**
   * Get an annotation list item by ID
   */
  getItem: async (itemId: string): Promise<AnnotationListResponse> => {
    return await apiClient.get<AnnotationListResponse>(`/annotation-lists/${encodeURIComponent(itemId)}`);
  },
};

