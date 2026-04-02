import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { IoDocumentText } from "react-icons/io5";
import { useAuth } from "@/auth/use-auth-hook";
import type { RecentActivityWithReviewCounts } from "@/api/types";
import { useMyWorkInProgress, useRecentActivity, useStartWork } from "@/hooks";

// Helper function to format date
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
    className="w-12 h-12 text-blue-500"
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

const RecentActivityIcon = () => (
  <svg
    className="w-6 h-6 text-gray-500"
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

export const AdminWorkSection: React.FC = () => {
  const navigate = useNavigate();
  const [isLoadingText, setIsLoadingText] = React.useState(false);
  const { currentUser } = useAuth();

  // Fetch user's work in progress
  const { data: workInProgress = [] } = useMyWorkInProgress();

  // Fetch recent activity data from API
  const { data: recentActivity = [], isLoading: isLoadingActivity } = useRecentActivity(10);

  // Mutation to start work - find work in progress or assign new text
  const startWorkMutation = useStartWork();

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

  return (
    <div className="space-y-6">
      {/* Start Work Card - Hide from reviewers */}
      {currentUser?.role !== "reviewer" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IoDocumentText className="w-5 h-5" />
              Work Management
            </CardTitle>
            <CardDescription>
              Manage annotation tasks and work in progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workInProgress.length > 0 ? (
              // Show work in progress
              <div className="max-w-2xl mx-auto">
                <div className="bg-orange-50 border-2 border-orange-200 p-6 rounded-lg">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold text-orange-800 mb-2">
                      Work in Progress
                    </h3>
                    <p className="text-orange-600 text-sm">
                      You have annotation tasks in progress
                    </p>
                  </div>
                  <div className="space-y-3">
                    {workInProgress.map((text) => (
                      <div
                        key={text.id}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {text.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            Status: {text.status} • Started:{" "}
                            {formatDate(text.updated_at || text.created_at)}
                          </p>
                        </div>
                        <Button
                          size="lg"
                          className="cursor-pointer"
                          onClick={() => navigate(`/task/${text.id}`)}
                        >
                          Continue
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Show start working
              <div className="max-w-lg mx-auto">
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardHeader className="text-center">
                    <StartWorkIcon />
                    <CardTitle className="text-xl">Start Working</CardTitle>
                    <CardDescription>
                      Begin annotating texts as an admin
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleStartWork}
                      disabled={isLoadingText}
                    >
                      {isLoadingText ? (
                        <>
                          <AiOutlineLoading3Quarters className="w-4 h-4 mr-2 animate-spin" />
                          Finding Text...
                        </>
                      ) : (
                        "Start Annotating"
                      )}
                    </Button>
                    <p className="text-sm text-gray-500 mt-3 text-center">
                      {isLoadingText
                        ? "Looking for available texts to annotate..."
                        : "Create new annotations, mark headers, identify persons and objects"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RecentActivityIcon />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Recent system-wide annotation activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActivity && (
            <div className="text-center py-8">
              <AiOutlineLoading3Quarters className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-500">Loading recent activity...</p>
            </div>
          )}
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <RecentActivityItem
                  key={activity.text.id}
                  activity={activity}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No recent activity yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function RecentActivityItem({
  activity,
}: {
  activity: RecentActivityWithReviewCounts;
}) {
  const navigate = useNavigate();

  // Handle clicking on recent activity item
  const handleActivityClick = (textId: number) => {
    navigate(`/task/${textId}`);
  };

  return (
    <div
      key={activity.text.id}
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
        <div className="flex-1">
          <p className="font-medium text-gray-900">{activity.text.title}</p>
          <p className="text-sm text-gray-500">
            {formatDate(activity.text.updated_at || activity.text.created_at)} •{" "}
            {activity.text.status}
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
      <Button
        variant="ghost"
        className="cursor-pointer"
        size="sm"
        onClick={() => handleActivityClick(activity.text.id)}
        disabled={activity.all_accepted}
      >
        {activity.all_accepted ? "View" : "Edit"}
      </Button>
    </div>
  );
}
