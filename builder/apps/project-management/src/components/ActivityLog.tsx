"use client";

interface ActivityUser {
  id: string;
  name: string | null;
  email: string;
}

interface ActivityItem {
  id: string;
  type: string;
  detail: string | null;
  taskId: string | null;
  projectId: string | null;
  userId: string;
  user: ActivityUser;
  createdAt: string;
}

interface ActivityLogProps {
  activities: ActivityItem[];
}

const activityConfig: Record<string, { color: string; fallbackText: string }> = {
  task_created: { color: "bg-green-500", fallbackText: "created this task" },
  status_changed: { color: "bg-blue-500", fallbackText: "changed the status" },
  assignee_changed: { color: "bg-purple-500", fallbackText: "updated the assignee" },
  assigned: { color: "bg-purple-500", fallbackText: "assigned to someone" },
  comment_added: { color: "bg-gray-400", fallbackText: "added a comment" },
  commented: { color: "bg-gray-400", fallbackText: "added a comment" },
  attachment_added: { color: "bg-orange-500", fallbackText: "attached a file" },
  subtask_completed: { color: "bg-green-500", fallbackText: "completed a subtask" },
  task_deleted: { color: "bg-red-500", fallbackText: "deleted a task" },
};

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ActivityLog({ activities }: ActivityLogProps) {
  if (activities.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-4 text-center">
        No activity recorded yet.
      </div>
    );
  }

  // Show in chronological order (oldest first)
  const sorted = [...activities].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="space-y-3">
      {sorted.map((activity) => {
        const config = activityConfig[activity.type] || {
          color: "bg-gray-300",
          fallbackText: activity.type.replace(/_/g, " "),
        };

        return (
          <div key={activity.id} className="flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${config.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium text-gray-900 dark:text-white">
                  {activity.user.name || activity.user.email}
                </span>{" "}
                {activity.detail || config.fallbackText}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatTimestamp(activity.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
