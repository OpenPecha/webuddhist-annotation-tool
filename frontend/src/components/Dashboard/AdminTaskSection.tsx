import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TextStatus } from "@/api/types";
import type { TextFilters } from "@/api/types";
import { toast } from "sonner";
import { useTexts, useDeleteText } from "@/hooks";
import { textApi } from "@/api/text";
import {
  exportAsJsonFile,
  exportAsTeiXmlFile,
} from "@/utils/exportAnnotation";
import { DocumentExportDropdown } from "@/components/DocumentExportDropdown";
import type { DocumentExportFormat } from "@/components/DocumentExportDropdown";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import {
  IoDocumentText,
  IoEye,
  IoChevronBack,
  IoChevronForward,
  IoTrash,
} from "react-icons/io5";

const getStatusBadge = (status: TextStatus) => {
  switch (status) {
    case TextStatus.DRAFT:
      return {
        variant: "secondary" as const,
        className:
          "border-stone-200 bg-stone-100/90 text-stone-800 dark:bg-stone-800/40",
        text: "Draft",
      };
    case TextStatus.INITIALIZED:
      return {
        variant: "secondary" as const,
        className:
          "border-sky-200/80 bg-sky-50 text-sky-900 dark:bg-sky-950/50",
        text: "Ready",
      };
    case TextStatus.ANNOTATION_IN_PROGRESS:
      return {
        variant: "secondary" as const,
        className:
          "border-amber-200/90 bg-amber-50 text-amber-950 dark:bg-amber-950/30",
        text: "In progress",
      };
    case TextStatus.ANNOTATED:
      return {
        variant: "secondary" as const,
        className:
          "border-yellow-200/80 bg-yellow-50 text-yellow-950 dark:bg-yellow-950/25",
        text: "Annotated",
      };
    case TextStatus.REVIEWED:
      return {
        variant: "secondary" as const,
        className:
          "border-emerald-200/90 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30",
        text: "Reviewed",
      };
    case TextStatus.PUBLISHED:
      return {
        variant: "secondary" as const,
        className:
          "border-violet-200/80 bg-violet-50 text-violet-950 dark:bg-violet-950/25",
        text: "Published",
      };
    default:
      return {
        variant: "secondary" as const,
        className: "border-border bg-muted text-muted-foreground",
        text: "Unknown",
      };
  }
};

const ITEMS_PER_PAGE = 10;

export const AdminTaskSection: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  const paginatedFilters: TextFilters = {
    skip,
    limit: ITEMS_PER_PAGE,
  };

  const {
    data: texts = [],
    isLoading,
    error,
  } = useTexts(paginatedFilters);

  const hasNextPage = texts.length === ITEMS_PER_PAGE;
  const hasPreviousPage = currentPage > 1;

  const handleViewTask = (textId: number) => {
    navigate(`/task/${textId}`);
  };

  const deleteTaskMutation = useDeleteText();

  const exportMutation = useMutation({
    mutationFn: async ({
      textId,
      format,
    }: {
      textId: number;
      format: DocumentExportFormat;
    }) => {
      const data = await textApi.getTextWithAnnotations(textId);
      return { data, format };
    },
    onSuccess: ({ data, format }) => {
      if (format === "json") {
        exportAsJsonFile(data);
      } else {
        exportAsTeiXmlFile(data);
      }
      let exportDescription: string;
      if (format === "json") {
        exportDescription =
          "Same JSON shape as bulk upload / annotator export.";
      } else {
        exportDescription =
          "TEI XML with diplomatic and annotated layers.";
      }
      toast.success("Export started", {
        description: exportDescription,
      });
    },
    onError: (err) => {
      toast.error("Export failed", {
        description:
          err instanceof Error ? err.message : "Please try again later.",
      });
    },
  });

  const handleDeleteTask = (textId: number) => {
    deleteTaskMutation.mutate(textId, {
      onSuccess: () => {
        toast.success("Task deleted", {
          description: "The document and its annotations were removed.",
        });
      },
      onError: (err) => {
        toast.error("Could not delete task", {
          description:
            err instanceof Error ? err.message : "Please try again later.",
        });
      },
    });
  };

  if (isLoading && texts.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <AiOutlineLoading3Quarters className="h-9 w-9 animate-spin text-primary" />
        <p className="font-sans text-sm text-muted-foreground">
          Loading documents…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/25 bg-destructive/5 px-6 py-12 text-center">
        <p className="font-display text-lg text-destructive">
          Could not load documents
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your connection and try again.
        </p>
      </div>
    );
  }

  const listingDescription =
    texts.length === 0
      ? "No documents on this page."
      : `Showing ${texts.length} document${texts.length === 1 ? "" : "s"} on page ${currentPage}.`;

  return (
     

      <Card className=" border-border/80 rounded-none bg-card/90 shadow-[0_24px_48px_-28px_oklch(0.35_0.04_65/0.25)] backdrop-blur-sm">
        <CardHeader className="border-b border-border/60 bg-gradient-to-br from-card to-muted/20 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <CardTitle className="font-display text-xl font-semibold">
                Task listing
              </CardTitle>
              <CardDescription className="mt-1.5 max-w-xl text-pretty">
                {listingDescription}
              </CardDescription>
            </div>
            {isLoading && (
              <AiOutlineLoading3Quarters className="h-5 w-5 shrink-0 animate-spin text-primary" />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100vh-300px)] overflow-auto">
          {texts.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <IoDocumentText className="mb-4 h-14 w-14 text-muted-foreground/40" />
              <p className="font-medium text-foreground">No documents here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Try another page, or add texts from the main workflow.
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border/70">
                {texts.map((text, index) => {
                  const statusBadge = getStatusBadge(text.status);
                  const annotatorName = text.annotator
                    ? text.annotator.full_name || text.annotator.username
                    : null;
                  const reviewerName = text.reviewer
                    ? text.reviewer.full_name || text.reviewer.username
                    : null;
                  const uploaderName = text.uploader
                    ? text.uploader.full_name || text.uploader.username
                    : "system";
                  const exportPending =
                    exportMutation.isPending &&
                    exportMutation.variables?.textId === text.id;

                  return (
                    <li
                      key={text.id}
                      className="group relative transition-colors duration-200 hover:bg-muted/30"
                      style={{
                        animationDelay: `${Math.min(index, 8) * 45}ms`,
                      }}
                    >
                      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-primary/0 transition-all duration-200 group-hover:bg-primary/70" />
                      <div className="flex flex-col gap-4 px-5 py-5 pl-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-lg font-semibold leading-snug text-foreground">
                              {text.title}
                            </h3>
                            <Badge
                              variant={statusBadge.variant}
                              className={statusBadge.className}
                            >
                              {statusBadge.text}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {text.language}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Uploaded by {uploaderName}</span>
                            {annotatorName && <span>Annotator · {annotatorName}</span>}
                            {reviewerName && <span>Reviewer · {reviewerName}</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                          <DocumentExportDropdown
                            variant="admin"
                            isPending={exportPending}
                            onSelectFormat={(format) =>
                              exportMutation.mutate({
                                textId: text.id,
                                format,
                              })
                            }
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-border/80 bg-background/80"
                            onClick={() => handleViewTask(text.id)}
                          >
                            <IoEye className="mr-1.5 h-4 w-4" />
                            Open
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10"
                                disabled={deleteTaskMutation.isPending}
                              >
                                {deleteTaskMutation.isPending ? (
                                  <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                                ) : (
                                  <IoTrash className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete document?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This removes &ldquo;{text.title}&rdquo; and all
                                  annotations. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteTask(text.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </li>
                  );
                })}
       
              </ul>

              {(hasPreviousPage || hasNextPage) && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-5 py-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={!hasPreviousPage}
                    >
                      <IoChevronBack className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={!hasNextPage}
                    >
                      Next
                      <IoChevronForward className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
  );
};
