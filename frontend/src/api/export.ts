import { apiClient, getHeaders } from "./utils";

// Use the same SERVER_URL as utils.ts to avoid double /v1/ paths
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:8000/v1";

export interface ExportStats {
  total_texts: number;
  total_annotations: number;
  date_range: {
    from: string;
    to: string;
  };
}

export interface ExportParams {
  fromDate: string; // YYYY-MM-DD format
  toDate: string; // YYYY-MM-DD format
}

export const exportApi = {
  /**
   * Get export statistics for a date range
   */
  async getExportStats(
    fromDate: string,
    toDate: string,
    filterType: string = "annotated"
  ): Promise<ExportStats> {
    return apiClient.get<ExportStats>("/export/stats", {
      from_date: fromDate,
      to_date: toDate,
      filter_type: filterType,
    });
  },

  /**
   * Download export data as ZIP file using native fetch for blob handling
   */
  async exportData(
    fromDate: string,
    toDate: string,
    filterType: string = "annotated"
  ): Promise<Blob> {
    const url = `${SERVER_URL}/export/download`;
    const params = new URLSearchParams({
      from_date: fromDate,
      to_date: toDate,
      filter_type: filterType,
    });

    const response = await fetch(`${url}?${params}`, {
      method: "GET",
      headers: await getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Export failed: ${response.status} ${errorText}`);
    }

    return response.blob();
  },

  /**
   * Helper function to trigger download of exported data
   */
  async downloadExport(
    fromDate: string,
    toDate: string,
    filterType: string = "annotated"
  ): Promise<void> {
    try {
      const blob = await this.exportData(fromDate, toDate, filterType);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filterType}_export_${fromDate}_to_${toDate}.zip`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download export:", error);
      throw error;
    }
  },

  /**
   * Download a single text document with annotations as JSON (admin).
   */
  async exportSingleText(textId: number): Promise<Blob> {
    const url = `${SERVER_URL}/export/text/${textId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: await getHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Export failed: ${response.status} ${errorText}`);
    }
    return response.blob();
  },

  async downloadSingleText(textId: number, fallbackTitle?: string): Promise<void> {
    const blob = await this.exportSingleText(textId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safe =
      fallbackTitle
        ?.replace(/[^\w\- ]+/g, "")
        .trim()
        .replace(/\s+/g, "_")
        .slice(0, 40) || "";
    link.download = safe
      ? `text_${textId}_${safe}.json`
      : `text_${textId}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
