import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import BulkUploadModal from "../BulkUploadModal";
import type { BulkUploadResponse } from "@/api/bulk-upload";
import { LoadTextModal } from "./LoadTextModal";
import { useAuth0 } from "@auth0/auth0-react";
import { useStartWork, useMyWorkInProgress, usePermission, useTexts } from "@/hooks";
import { ListTodo } from "lucide-react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const StartWorkIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
    />
  </svg>
);

export const RegularUserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth0();
  const { role } = usePermission();
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showLoadTextModal, setShowLoadTextModal] = useState(false);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const startWorkMutation = useStartWork();
  const ITEMS_PER_PAGE = 10;
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  const { data: workInProgress = [], isLoading: isLoadingWorkInProgress } =
    useMyWorkInProgress();
  const { data: paginatedTexts = [], isLoading: isLoadingTexts } = useTexts({
    skip,
    limit: ITEMS_PER_PAGE,
  });
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = paginatedTexts.length === ITEMS_PER_PAGE;

  const handleStartWork = () => {
    setIsLoadingText(true);
    startWorkMutation.mutate(undefined, {
      onSuccess: (text) => {
        toast.success(`✅ Work Started`, {
          description: `Starting work on: "${text.title}"`,
        });
        navigate(`/task/${text.id}`);
        setIsLoadingText(false);
      },
      onError: (error) => {
        let errorMessage = "Failed to start work";
        let errorTitle = "❌ Error";

        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error && typeof error === "object" && "detail" in error) {
          const apiError = error as { detail: string; status_code?: number };
          errorMessage = apiError.detail || "Failed to start work";

          if (apiError.status_code === 404) {
            errorTitle = "📝 No Tasks Available";
            errorMessage =
              "No texts available for annotation at this time. Please contact your administrator to add more texts to the system.";
          }
        }

        if (errorTitle.includes("No Tasks Available")) {
          toast.info(errorTitle, {
            description: errorMessage,
          });
        } else {
          toast.error(errorTitle, {
            description: errorMessage,
          });
        }

        setIsLoadingText(false);
      },
    });
  };

  const handleBulkUploadComplete = (result: BulkUploadResponse) => {
    if (result.success) {
      toast.success("Bulk upload completed successfully!", {
        description: `${result.summary.total_texts_created} texts and ${result.summary.total_annotations_created} annotations created`,
      });
    }
    setShowBulkUploadModal(false);
  };

  const startBusy = isLoadingText || startWorkMutation.isPending;

  return (
    <div className="flex-1 bg-background flex">
      <button
        className="md:hidden fixed top-16 left-4 z-50 p-2 bg-card border border-border rounded-lg shadow-md text-foreground"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {sidebarOpen && (
        <button
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 w-full h-full"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSidebarOpen(false);
          }}
          aria-label="Close sidebar"
        />
      )}

      <div
        className={`w-80 bg-card border-r border-border flex flex-col fixed md:relative h-full z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-border">
          <h1 className="font-display text-xl font-semibold text-foreground">
            Welcome, {user?.name}
          </h1>
        </div>

        <div className="flex-1 p-6 space-y-4">
          <Button
            size="lg"
            className="w-full h-12 text-base font-medium"
            onClick={handleStartWork}
            disabled={startBusy}
          >
            {startBusy ? (
              <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin" />
            ) : (
              <StartWorkIcon />
            )}
            <span className="ml-2">{startBusy ? "Starting…" : "Start Work"}</span>
          </Button>

          {role === "user" && (
            <Button
              size="lg"
              variant="outline"
              className="w-full h-12 text-base font-medium"
              onClick={() => setShowLoadTextModal(true)}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="ml-2">Load Text</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto md:ml-0 ml-0">
        <div className="p-4 md:p-8 pt-20 md:pt-8">
          {user && (
            <div className="mb-8">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <ListTodo className="w-5 h-5 text-muted-foreground" />
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    My Tasks
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Texts you are currently working on
                </p>
              </div>
              {isLoadingWorkInProgress && (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading tasks...</p>
                </div>
              )}
              {!isLoadingWorkInProgress && workInProgress.length > 0 && (
                <div className="space-y-3">
                  {workInProgress.map((text) => (
                    <div
                      key={text.id}
                      className="flex w-full items-center justify-between px-4 py-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {text.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Status: {text.status} •{" "}
                          {formatDate(text.updated_at || text.created_at)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="ml-4 shrink-0"
                        onClick={() => navigate(`/task/${text.id}`)}
                      >
                        Continue
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {!isLoadingWorkInProgress && workInProgress.length === 0 && (
                <div className="text-center py-6 border border-dashed border-border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">No tasks in progress.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use <strong>Start Work</strong> in the sidebar to pick a text
                    {role === "user" ? (
                      <>
                        , or <strong>Load Text</strong> to upload your own.
                      </>
                    ) : (
                      "."
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {(role === "user" || role === "annotator") && (
            <div className="mb-8">
              <div className="mb-4">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  All Documents
                </h2>
                <p className="text-sm text-muted-foreground">
                  Browse all documents with pagination
                </p>
              </div>
              {isLoadingTexts && (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading documents...</p>
                </div>
              )}
              {!isLoadingTexts && paginatedTexts.length > 0 && (
                <div className="space-y-3">
                  {paginatedTexts.map((text) => (
                    <div
                      key={text.id}
                      className="flex w-full items-center justify-between px-4 py-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {text.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Status: {text.status} • {formatDate(text.updated_at || text.created_at)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="ml-4 shrink-0"
                        onClick={() => navigate(`/task/${text.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">Page {currentPage}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={!hasPreviousPage}
                      >
                        <IoChevronBack className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => p + 1)}
                        disabled={!hasNextPage}
                      >
                        Next
                        <IoChevronForward className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {!isLoadingTexts && paginatedTexts.length === 0 && (
                <div className="text-center py-6 border border-dashed border-border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">No documents found on this page.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <BulkUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onUploadComplete={handleBulkUploadComplete}
      />

      <LoadTextModal
        isOpen={showLoadTextModal}
        onClose={() => setShowLoadTextModal(false)}
      />
    </div>
  );
};
