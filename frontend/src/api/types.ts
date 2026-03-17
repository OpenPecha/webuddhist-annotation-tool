// Base API response structure
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

export interface SearchParams extends PaginationParams {
  q: string;
}

// Text-related types
export const TextStatus = {
  DRAFT: "draft",
  INITIALIZED: "initialized",
  ANNOTATION_IN_PROGRESS: "progress",
  ANNOTATED: "annotated",
  REVIEWED: "reviewed",
  PUBLISHED: "published",
} as const;

export type TextStatus = (typeof TextStatus)[keyof typeof TextStatus];

export interface TextBase {
  title: string;
  content: string;
  translation?: string;
  source?: string;
  language: string;
}

export interface TextCreate extends TextBase {
  annotation_type_id?: string;
}

export interface TextUpdate {
  title?: string;
  content?: string;
  translation?: string;
  diplomatic_text?: string | null;
  source?: string;
  language?: string;
  status?: TextStatus;
  reviewer_id?: number;
}

export interface UserInfo {
  id: number;
  username: string;
  full_name?: string;
  email?: string;
}

export interface TextResponse extends TextBase {
  id: number;
  status: TextStatus;
  annotator_id?: number;
  reviewer_id?: number;
  uploaded_by?: number;
  created_at: string;
  updated_at?: string;
  annotations_count?: number;
  annotator?: UserInfo;
  reviewer?: UserInfo;
  uploader?: UserInfo;
  annotation_type_id?: string;
  /** For TEI XML upload: annotation types created (e.g. ["pos", "tei_editorial"]) for filter selection */
  annotation_types_created?: string[];
  /** Plain text from TEI div subtype=diplomatic (optional, may be omitted in list responses) */
  diplomatic_text?: string | null;
}

export interface DiplomaticTextResponse {
  diplomatic_text: string | null;
}

export interface TextFilters extends PaginationParams {
  status?: TextStatus;
  language?: string;
  reviewer_id?: number;
  uploaded_by?: "system" | "user";
  [key: string]: string | number | boolean | undefined;
}

// Annotation-related types
export type AnnotationLevel = "minor" | "major" | "critical";

export interface AnnotationBase {
  annotation_type: string;
  start_position: number;
  end_position: number;
  selected_text?: string;
  label?: string;
  name?: string; // Custom name for the annotation (especially for headers)
  level?: AnnotationLevel; // Importance level: minor, major, critical
  meta?: Record<string, unknown>;
  confidence: number;
}

export interface AnnotationCreate extends AnnotationBase {
  text_id: number;
}

export interface AnnotationUpdate {
  annotation_type?: string;
  start_position?: number;
  end_position?: number;
  selected_text?: string;
  label?: string;
  name?: string; // Custom name for the annotation
  level?: AnnotationLevel; // Importance level: minor, major, critical
  meta?: Record<string, unknown>;
  confidence?: number;
}

export interface AnnotationResponse extends AnnotationBase {
  id: number;
  text_id: number;
  annotator_id?: number; // Can be undefined for system annotations
  created_at: string;
  updated_at?: string;
  is_agreed?: boolean; // Whether annotation has been agreed upon by a reviewer
}

export interface AnnotationFilters extends PaginationParams {
  text_id?: number;
  annotator_id?: number;
  annotation_type?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface AnnotationStats {
  total_annotations: number;
  annotations_by_type: Record<string, number>;
  annotations_by_user: Record<string, number>;
}

export interface ValidatePositionsRequest {
  text_id: number;
  start_position: number;
  end_position: number;
}

export interface ValidatePositionsResponse {
  valid: boolean;
  error?: string;
  selected_text?: string;
}

export interface DeleteMyAnnotationsResponse {
  message: string;
  deleted_count: number;
}

export interface BulkCreateAnnotationsRequest {
  text_id: number;
  annotation_type: string;
  label?: string | null;
  name?: string | null;
  level?: "minor" | "major" | "critical" | null;
  selected_text: string;
  spans: Array<{ start_position: number; end_position: number }>;
}

export interface BulkCreateAnnotationsResponse {
  created_count: number;
}

export interface BulkDeleteByCriteriaRequest {
  text_id: number;
  annotation_type: string;
  label?: string | null;
  selected_text: string;
}

export interface BulkDeleteAnnotationsResponse {
  deleted_count: number;
}

// User-related types
export const UserRole = {
  USER: "user",
  ANNOTATOR: "annotator",
  REVIEWER: "reviewer",
  ADMIN: "admin",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface UserBase {
  username: string;
  email: string;
  full_name?: string;
}

export interface UserCreate extends UserBase {
  role: UserRole;
  is_active: boolean;
}

/** Data for register/sync on login. auth0_user_id required; works without auth token. */
export interface RegisterUserData {
  auth0_user_id: string;
  username: string;
  email?: string;
  full_name?: string;
  picture?: string;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface UserResponse extends UserBase {
  id: number;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserFilters extends PaginationParams {
  is_active?: boolean;
  role?: UserRole;
}

// Combined types
export interface TextWithAnnotations extends TextResponse {
  annotations: AnnotationResponse[];
}

export interface TaskSubmissionResponse {
  submitted_task: TextResponse;
  next_task?: TextResponse;
  message: string;
}

export interface UserStats {
  texts_annotated: number;
  reviews_completed: number;
  total_annotations: number;
  accuracy_rate: number;
}

// API Error types
export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface ValidationError {
  detail: Array<{
    loc: string[];
    msg: string;
    type: string;
  }>;
}

// Stats types
export interface TextStats {
  total_texts: number;
  texts_by_status: Record<TextStatus, number>;
  texts_by_language: Record<string, number>;
}

// Rejected Texts
export interface RejectedTextWithDetails {
  id: number;
  text_id: number;
  text_title: string;
  text_language?: string;
  rejected_at: string;
}

// Admin Text Statistics
export interface AdminTextStatistics {
  total: number;
  initialized: number;
  annotated: number;
  reviewed: number;
  skipped: number;
  progress: number;
  total_rejections: number;
  unique_rejected_texts: number;
  heavily_rejected_texts: number;
  total_active_users: number;
  available_for_new_users: number;
}

// Recent Activity with Review Counts
export interface RecentActivityWithReviewCounts {
  text: TextResponse;
  total_annotations: number;
  accepted_count: number;
  rejected_count: number;
  all_accepted: boolean;
}
