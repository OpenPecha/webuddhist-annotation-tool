export const queryKeys = {
  // Annotation Lists
  annotationLists: {
    all: ["annotation-lists"] as const,
    types: ["annotation-list-types"] as const,
    byType: (type: string) => ["annotation-list", type] as const,
  },

  // Annotation Types
  annotationTypes: {
    all: ["annotation-types"] as const,
  },

  // Annotations
  annotations: {
    all: ["annotations"] as const,
    detail: (id: number) => ["annotation", id] as const,
    byText: (textId: string | number) => ["annotations-by-text", textId] as const,
    byType: (type: string) => ["annotations-by-type", type] as const,
    myAnnotations: ["my-annotations"] as const,
    stats: (textId?: number) => textId ? ["annotation-stats", textId] as const : ["annotation-stats"] as const,
  },

  // Texts
  texts: {
    all: ["texts"] as const,
    detail: (id: string | number) => ["text", id] as const,
    withAnnotations: (id: number) => ["text-with-annotations", id] as const,
    forAnnotation: ["texts-for-annotation"] as const,
    forReview: ["texts-for-review"] as const,
    myWorkInProgress: ["my-work-in-progress"] as const,
    sharedWithMe: ["shared-with-me"] as const,
    myRejectedTexts: ["my-rejected-texts"] as const,
    recentActivity: (limit?: number) => limit ? ["recent-activity", limit] as const : ["recent-activity"] as const,
    stats: ["text-stats"] as const,
    adminStats: ["admin-text-statistics"] as const,
    search: (query: string) => ["texts-search", query] as const,
  },

  // Reviews
  reviews: {
    all: ["reviews"] as const,
    forReview: ["texts-for-review-list"] as const,
    myProgress: ["my-review-progress"] as const,
    session: (textId: number) => ["review-session", textId] as const,
    status: (textId: number) => ["review-status", textId] as const,
    myReviews: ["my-reviews"] as const,
    annotationReviews: (annotationId: number) => ["annotation-reviews", annotationId] as const,
    stats: ["reviewer-stats"] as const,
    textsNeedingRevision: ["texts-needing-revision"] as const,
  },

  // Users
  users: {
    all: ["users"] as const,
    detail: (id: number) => ["user", id] as const,
    currentUser: ["current-user"] as const,
    roleByAuth0: (auth0Sub: string) => ["user-role", auth0Sub] as const,
    search: (query: string) => ["users", "search", query] as const,
    stats: ["user-stats"] as const,
  },

  // OpenPecha
  openPecha: {
    texts: (type?: string) => type ? ["openpecha-texts", type] as const : ["openpecha-texts"] as const,
    instances: (textId: string) => ["openpecha-instances", textId] as const,
    content: (instanceId: string) => ["openpecha-content", instanceId] as const,
  },

  // Bulk Upload
  bulkUpload: {
    validate: (file: string) => ["bulk-validate", file] as const,
  },

  // Export
  export: {
    stats: ["export-stats"] as const,
  },
} as const;

