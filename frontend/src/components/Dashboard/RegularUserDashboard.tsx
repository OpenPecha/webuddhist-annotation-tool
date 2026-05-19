import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useAuth0 } from "@auth0/auth0-react";
import {
  useStartWork,
  useAssignMe,
  useMyWorkInProgress,
  usePermission,
  useSharedTexts,
  useTexts,
} from "@/hooks";
import { ListTodo } from "lucide-react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TextStatus, type TextResponse } from "@/api/types";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getInitials = (name?: string) => {
  if (!name) return "SY";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"my-work" | "shared" | "all-tasks">("my-work");
  const [myWorkPage, setMyWorkPage] = useState(1);
  const [sharedPage, setSharedPage] = useState(1);
  const [allTasksPage, setAllTasksPage] = useState(1);

  const startWorkMutation = useStartWork();
  const assignMeMutation = useAssignMe();
  const canClaimTasks =
    role === "annotator" || role === "reviewer" || role === "admin";
  const ITEMS_PER_PAGE = 10;
  const myWorkSkip = (myWorkPage - 1) * ITEMS_PER_PAGE;
  const sharedSkip = (sharedPage - 1) * ITEMS_PER_PAGE;
  const allTasksSkip = (allTasksPage - 1) * ITEMS_PER_PAGE;

  const { data: workInProgress = [], isLoading: isLoadingWorkInProgress } = useMyWorkInProgress({
    skip: myWorkSkip,
    limit: ITEMS_PER_PAGE,
  });
  const { data: sharedTexts = [], isLoading: isLoadingSharedTexts } = useSharedTexts({
    skip: sharedSkip,
    limit: ITEMS_PER_PAGE,
  });
  const { data: paginatedTexts = [], isLoading: isLoadingTexts } = useTexts({
    skip: allTasksSkip,
    limit: ITEMS_PER_PAGE,
  });
  const hasPreviousMyWorkPage = myWorkPage > 1;
  const hasNextMyWorkPage = workInProgress.length === ITEMS_PER_PAGE;
  const hasPreviousSharedPage = sharedPage > 1;
  const hasNextSharedPage = sharedTexts.length === ITEMS_PER_PAGE;
  const hasPreviousAllTasksPage = allTasksPage > 1;
  const hasNextAllTasksPage = paginatedTexts.length === ITEMS_PER_PAGE;
  const canViewAllTasksTab =
    role === "annotator" || role === "reviewer" || role === "admin";

  const openSharedText = (text: TextResponse) => {
    if (text.current_user_permission === "write") {
      navigate(`/task/${text.id}`);
      return;
    }

    navigate(`/task/${text.id}`, {
      state: { forceReadOnly: true },
    });
  };

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
            errorTitle = "📝 No work in progress";
            errorMessage = canClaimTasks
              ? "Use Assign me to claim an unassigned document."
              : "No task is currently assigned to you.";
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

  const handleAssignMe = () => {
    setIsAssigning(true);
    assignMeMutation.mutate(undefined, {
      onSuccess: (text) => {
        navigate(`/task/${text.id}`);
        setIsAssigning(false);
      },
      onError: () => {
        setIsAssigning(false);
      },
    });
  };

  const hasTaskInProgress = workInProgress.some(
    (text) => text.status === TextStatus.ANNOTATION_IN_PROGRESS
  );

  const startBusy = isLoadingText || startWorkMutation.isPending;
  const assignBusy = isAssigning || assignMeMutation.isPending;
  const canAssignNewTask = canClaimTasks  && !isLoadingWorkInProgress;

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
            <span className="ml-2">
              {startBusy ? "Opening…" : "Continue work"}
            </span>
          </Button>

          {canClaimTasks && (
            <Button
              size="lg"
              variant="outline"
              className="w-full h-12 text-base font-medium"
              onClick={handleAssignMe}
              disabled={assignBusy || !canAssignNewTask}
              title={
                hasTaskInProgress
                  ? "Finish or continue your current task before claiming another"
                  : undefined
              }
            >
              {assignBusy ? (
                <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin" />
              ) : (
                <StartWorkIcon />
              )}
              <span className="ml-2">
                {assignBusy ? "Assigning…" : "Assign me"}
              </span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto md:ml-0 ml-0">
        <div className="p-4 md:p-8 pt-20 md:pt-8">
          {user && (
            <div className="mb-6">
              <div className="inline-flex rounded-lg border border-border bg-card p-1">
                <Button
                  variant={activeTab === "my-work" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("my-work")}
                  className="rounded-md"
                >
                  My Work
                </Button>
            
                {canViewAllTasksTab && (
                  <Button
                    variant={activeTab === "all-tasks" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("all-tasks")}
                    className="rounded-md"
                  >
                    All Tasks
                  </Button>
                )}
              </div>
            </div>
          )}

          {user && activeTab === "my-work" && (
            <div className="mb-8">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <ListTodo className="w-5 h-5 text-muted-foreground" />
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    My Work
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {canClaimTasks
                    ? "Documents assigned to you"
                    : "Tasks you can write on"}
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
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(text.uploader?.full_name || text.uploader?.username || "System")}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-muted-foreground truncate">
                            Owner: {text.uploader?.full_name || text.uploader?.username || "System"}
                          </p>
                        </div>
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
                        Open & Edit
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">Page {myWorkPage}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMyWorkPage((p) => Math.max(1, p - 1))}
                        disabled={!hasPreviousMyWorkPage}
                      >
                        <IoChevronBack className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMyWorkPage((p) => p + 1)}
                        disabled={!hasNextMyWorkPage}
                      >
                        Next
                        <IoChevronForward className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {!isLoadingWorkInProgress && workInProgress.length === 0 && (
                <div className="text-center py-6 border border-dashed border-border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">No writable tasks found.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {canClaimTasks ? (
                      hasTaskInProgress ? (
                        <>
                          Use <strong>Continue work</strong> for your current
                          task. Submit or skip it before using{" "}
                          <strong>Assign me</strong> again.
                        </>
                      ) : (
                        <>
                          Use <strong>Assign me</strong> to claim an unassigned
                          document.
                        </>
                      )
                    ) : (
                      "No tasks are assigned to you yet."
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

      

          {user && canViewAllTasksTab && activeTab === "all-tasks" && (
            <div className="mb-8">
              <div className="mb-4">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  All Tasks
                </h2>
                <p className="text-sm text-muted-foreground">
                  Browse all tasks with pagination
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
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(text.uploader?.full_name || text.uploader?.username || "System")}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-muted-foreground truncate">
                            Owner: {text.uploader?.full_name || text.uploader?.username || "System"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Status: {text.status} • {formatDate(text.updated_at || text.created_at)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="ml-4 shrink-0"
                        onClick={() =>
                          navigate(`/task/${text.id}`, {
                            state: { forceReadOnly: true },
                          })
                        }
                      >
                        View
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">Page {allTasksPage}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAllTasksPage((p) => Math.max(1, p - 1))}
                        disabled={!hasPreviousAllTasksPage}
                      >
                        <IoChevronBack className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAllTasksPage((p) => p + 1)}
                        disabled={!hasNextAllTasksPage}
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

    </div>
  );
};
