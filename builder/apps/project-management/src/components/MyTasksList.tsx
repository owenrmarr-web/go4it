"use client";

import Link from "next/link";

interface TaskItem {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  projectId: string;
  project: {
    id: string;
    name: string;
    color: string;
  };
}

interface MyTasksListProps {
  tasks: TaskItem[];
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  todo: { label: "To Do", bg: "bg-gray-100", text: "text-gray-700" },
  "in-progress": { label: "In Progress", bg: "bg-blue-100", text: "text-blue-700" },
  done: { label: "Done", bg: "bg-green-100", text: "text-green-700" },
};

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No due date";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MyTasksList({ tasks }: MyTasksListProps) {
  // Group tasks by project
  const grouped: Record<string, { project: TaskItem["project"]; tasks: TaskItem[] }> = {};
  for (const task of tasks) {
    if (!grouped[task.projectId]) {
      grouped[task.projectId] = { project: task.project, tasks: [] };
    }
    grouped[task.projectId].tasks.push(task);
  }

  const groups = Object.values(grouped);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.project.id}>
          {/* Project header */}
          <div className="flex items-center gap-2.5 mb-3">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: group.project.color }}
            />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{group.project.name}</h3>
            <span className="text-xs text-gray-400">({group.tasks.length})</span>
          </div>

          {/* Task list */}
          <div className="space-y-2">
            {group.tasks.map((task) => {
              const status = statusConfig[task.status] || statusConfig.todo;
              const overdue = task.status !== "done" && isOverdue(task.dueDate);

              return (
                <Link
                  key={task.id}
                  href={`/projects/${task.projectId}/tasks/${task.id}`}
                  className="block"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 px-4 py-3 hover:shadow-sm transition-shadow flex items-center gap-3">
                    {/* Task title */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          task.status === "done"
                            ? "text-gray-400 line-through"
                            : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {task.title}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
                    >
                      {status.label}
                    </span>

                    {/* Due date */}
                    <span
                      className={`flex-shrink-0 text-xs ${
                        overdue ? "text-red-600 font-medium" : "text-gray-400"
                      }`}
                    >
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
