import { useQuery, useMutation } from "@tanstack/react-query";
import { exportApi, type ExportStats } from "@/api/export";
import { queryKeys } from "@/constants/queryKeys";

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get export statistics for a date range
 */
export const useExportStats = (
  fromDate: string,
  toDate: string,
  filterType: "reviewed" | "annotated" = "annotated",
  enabled = true
) => {
  return useQuery<ExportStats>({
    queryKey: [...queryKeys.export.stats, fromDate, toDate, filterType],
    queryFn: () => exportApi.getExportStats(fromDate, toDate, filterType),
    enabled: enabled && !!fromDate && !!toDate,
    staleTime: 1000 * 60, // 1 minute
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Download export as ZIP file
 */
export const useDownloadExport = () => {
  return useMutation({
    mutationFn: ({
      fromDate,
      toDate,
      filterType = "annotated",
    }: {
      fromDate: string;
      toDate: string;
      filterType?: "reviewed" | "annotated";
    }) => exportApi.downloadExport(fromDate, toDate, filterType),
  });
};

/**
 * Export data as blob (for custom handling)
 */
export const useExportData = () => {
  return useMutation({
    mutationFn: ({
      fromDate,
      toDate,
      filterType = "annotated",
    }: {
      fromDate: string;
      toDate: string;
      filterType?: "reviewed" | "annotated";
    }) => exportApi.exportData(fromDate, toDate, filterType),
  });
};

/**
 * Download one document as JSON (admin task list).
 */
export const useDownloadSingleText = () => {
  return useMutation({
    mutationFn: ({
      textId,
      title,
    }: {
      textId: number;
      title?: string;
    }) => exportApi.downloadSingleText(textId, title),
  });
};

