import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { RecentActivityWithReviewCounts } from "@/api/types";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import BulkUploadModal from "../BulkUploadModal";
import type { BulkUploadResponse } from "@/api/bulk-upload";
import { LoadTextModal } from "./LoadTextModal";
import {
  useStartWork,
  useMyWorkInProgress,
  useRecentActivity,
  useStartReviewing,
  useCurrentUser,
} from "@/hooks";
import { CalendarIcon, ListTodo } from "lucide-react";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Icon components
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

const ReviewWorkIcon = () => (
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
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const RecentActivityIcon = () => (
  <svg
    className="w-5 h-5 text-gray-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);


export const RegularUserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showLoadTextModal, setShowLoadTextModal] = useState(false);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mutation to start work - find work in progress or assign new text
  const startWorkMutation = useStartWork();

  // Mutation to start reviewing
  const startReviewingMutation = useStartReviewing();

  // Fetch user's work in progress
  const { data: workInProgress = [], isLoading: isLoadingWorkInProgress } = useMyWorkInProgress();

  // Fetch recent activity data from API
  const { data: recentActivity = [], isLoading: isLoadingActivity } = useRecentActivity(10);

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

  const handleReviewWork = () => {
    startReviewingMutation.mutate(1, {
      onSuccess: (firstText) => {
        toast.success("Starting Review", {
          description: `Starting review for: "${firstText.title}"`,
        });
        navigate(`/review/${firstText.id}`);
      },
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : "Please try again";
        
        if (errorMessage.includes("No texts available")) {
          toast.info("📝 No Reviews Available", {
            description: "No texts are ready for review at this time.",
          });
        } else {
          toast.error("Failed to start review", {
            description: errorMessage,
          });
        }
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

  // Helper function to determine activity type
  const getActivityType = (activity: RecentActivityWithReviewCounts) => {
    if (activity.text.reviewer_id === currentUser?.id) {
      return "review";
    }
    return "annotation";
  };

  return (
    <div className="flex-1 bg-gray-50 flex">
      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-16 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <button
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 w-full h-full"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSidebarOpen(false);
            }
          }}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <div className={`w-80 bg-white border-r border-gray-200 flex flex-col fixed md:relative h-full z-50 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">
            Welcome, {currentUser?.full_name}
          </h1>
        
        </div>

        {/* Action Buttons */}
        <div className="flex-1 p-6 space-y-4">
         

          {/* Review Work Button - Show for reviewers or admins */}
          {(currentUser?.role === "reviewer" || currentUser?.role === "admin") && (
            <Button
              size="lg"
              variant="outline"
              className="w-full h-12 text-base font-medium"
              onClick={handleReviewWork}
            >
              <ReviewWorkIcon />
              <span className="ml-2">Review Work</span>
            </Button>
          )}

          {/* Load Text Button - Show only for users and admins (not annotators or reviewers) */}
          {currentUser?.role === "user" && (
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
          {/* Bulk Upload Button - Show for admins only */}
        
          {currentUser?.role === "admin" && (
      <Link to="/admin" className=" transition-colors">Admin Dashboard</Link>
          )}

        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto md:ml-0 ml-0">
        <div className="p-4 md:p-8 pt-20 md:pt-8">
          {/* My Tasks Section - Show for annotators and users (same as Start Work / Load) */}
          {(currentUser?.role === "annotator" || currentUser?.role === "user") && (
            <div className="mb-8">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <ListTodo className="w-5 h-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
                </div>
                <p className="text-sm text-gray-600">
                  Texts you are currently working on
                </p>
              </div>
              {isLoadingWorkInProgress && (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
                  <p className="text-gray-500">Loading tasks...</p>
                </div>
              )}
              {!isLoadingWorkInProgress && workInProgress.length > 0 && (
                <div className="space-y-3">
                  {workInProgress.map((text) => (
                    <div
                      key={text.id}
                      className="flex w-full items-center justify-between px-4 py-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{text.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Status: {text.status} • {formatDate(text.updated_at || text.created_at)}
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
                <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-gray-500">No tasks in progress.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Use <strong>Start Work</strong> or <strong>Load Text</strong> in the sidebar to begin.
                  </p>
                </div>
              )}
            </div>
          )}


      
        </div>
      </div>

      {/* Bulk Upload Modal */}
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

function RecentActivityItem({
  activity,
  activityType,
}: {
  readonly activity: RecentActivityWithReviewCounts;
  readonly activityType: string;
}) {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  // Handle clicking on recent activity item
  const handleActivityClick = (textId: number) => {
    if(activity.text.status === "reviewed" && currentUser?.role !== "admin" && currentUser?.role !== "reviewer") {
      alert("this is reviewed text.");
      return;
    }
    navigate(`/task/${textId}`);
  };



  // Determine button text based on activity type and status
  const getButtonText = () => {
    if (activity.all_accepted && activityType === "annotation") {
      return "View";
    }
    if (activityType === "annotation") {
      return "Edit";
    }
    return "Review";
  };
  const buttonText:string = activity.all_accepted && activityType === "annotation" ? "View" : getButtonText();
  return (
    <button
      key={activity.text.id}
      title={buttonText} 
      className="flex w-full px-2 py-1 items-center justify-between border-b border-gray-100 hover:bg-neutral-200 hover:border-blue-200 hover:shadow-sm transition-all duration-200 cursor-pointer rounded-lg mx-1"
      onClick={() => handleActivityClick(activity.text.id)}
    >
      <div className="flex items-center gap-3">
      
        <div className="flex-1">
          <p className="font-medium capitalize text-left text-gray-900  transition-colors">
            {activity.text.title}
          </p>
         
          {activity.total_annotations > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                ✓ {activity.accepted_count}
              </span>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                ✗ {activity.rejected_count}
              </span>
              <span className="text-xs text-gray-500">
                {activity.total_annotations} total
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center">
        <span className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
          <span className="flex items-center gap-1">
            <CalendarIcon className="w-4 h-4" />
                      {formatDate(activity.text.updated_at || activity.text.created_at)} •{" "}
            </span>
          <p className="text-sm text-gray-500 text-left">
            {activity.text.status}
          </p>
        </span>
      </div>
    </button>
  );
}

