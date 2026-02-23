"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import TaskCard from "@/components/TaskCard";

interface TaskLabel {
  label: {
    id: string;
    name: string;
    color: string;
  };
}

interface Assignee {
  id: string;
  name: string | null;
  email: string;
}

interface CustomStatus {
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  estimate: number | null;
  position: number;
  createdAt: string;
  assignee: Assignee | null;
  labels: TaskLabel[];
  milestoneId: string | null;
}

interface TaskListViewProps {
  tasks: Task[];
  customStatuses: CustomStatus[];
  projectId: string;
  onToggleDone: (taskId: string, currentStatus: string) => void;
}

type SortField = "title" | "status" | "dueDate" | "assignee" | "estimate";
type SortDirection = "asc" | "desc";

// Default status order for grouping
const defaultStatusOrder = ["todo", "in-progress", "in_progress", "done"];

function getStatusGroupLabel(status: string, customStatuses: CustomStatus[]): string {
  const labels: Record<string, string> = {
    todo: "To Do",
    "in-progress": "In Progress",
    in_progress: "In Progress",
    done: "Done",
  };
  if (labels[status]) return labels[status];
  const custom = customStatuses.find((cs) => cs.name.toLowerCase() === status.toLowerCase());
  return custom ? custom.name : status.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusGroupColor(status: string): string {
  const colors: Record<string, string> = {
    todo: "bg-gray-400",
    "in-progress": "bg-blue-500",
    in_progress: "bg-blue-500",
    done: "bg-green-500",
  };
  return colors[status] || "bg-purple-500";
}

export default function TaskListView({
  tasks,
  customStatuses,
  projectId,
  onToggleDone,
}: TaskListViewProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "dueDate": {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          cmp = aDate - bDate;
          break;
        }
        case "assignee": {
          const aName = a.assignee?.name || a.assignee?.email || "";
          const bName = b.assignee?.name || b.assignee?.email || "";
          cmp = aName.localeCompare(bName);
          break;
        }
        case "estimate": {
          const aEst = a.estimate ?? Infinity;
          const bEst = b.estimate ?? Infinity;
          cmp = aEst - bEst;
          break;
        }
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [tasks, sortField, sortDirection]);

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups = new Map<string, Task[]>();

    for (const task of sortedTasks) {
      const existing = groups.get(task.status);
      if (existing) {
        existing.push(task);
      } else {
        groups.set(task.status, [task]);
      }
    }

    // Sort groups: default statuses first, then custom
    const sortedGroups: [string, Task[]][] = [];
    for (const status of defaultStatusOrder) {
      const group = groups.get(status);
      if (group) {
        sortedGroups.push([status, group]);
        groups.delete(status);
      }
    }
    // Remaining custom statuses
    for (const [status, group] of groups) {
      sortedGroups.push([status, group]);
    }

    return sortedGroups;
  }, [sortedTasks]);

  const toggleGroup = (status: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const handleTaskClick = (taskId: string) => {
    router.push(`/projects/${projectId}/tasks/${taskId}`);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <svg className="w-3 h-3 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={sortDirection === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
        />
      </svg>
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">No tasks yet. Create your first task to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Column headers */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <div className="w-4 flex-shrink-0" />
        <button
          onClick={() => handleSort("title")}
          className="flex-1 text-left hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Task <SortIcon field="title" />
        </button>
        <button
          onClick={() => handleSort("status")}
          className="w-24 text-left hover:text-gray-700 transition-colors"
        >
          Status <SortIcon field="status" />
        </button>
        <button
          onClick={() => handleSort("assignee")}
          className="w-8 hover:text-gray-700 transition-colors"
          title="Assignee"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
        <button
          onClick={() => handleSort("dueDate")}
          className="w-16 text-left hover:text-gray-700 transition-colors"
        >
          Due <SortIcon field="dueDate" />
        </button>
        <div className="w-24 hidden sm:block">Labels</div>
        <button
          onClick={() => handleSort("estimate")}
          className="w-10 text-left hover:text-gray-700 transition-colors hidden md:block"
        >
          Est <SortIcon field="estimate" />
        </button>
      </div>

      {/* Grouped tasks */}
      {groupedTasks.map(([status, groupTasks]) => {
        const isCollapsed = collapsedGroups.has(status);
        return (
          <div key={status}>
            {/* Group header */}
            <button
              onClick={() => toggleGroup(status)}
              className="w-full flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                  isCollapsed ? "" : "rotate-90"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className={`w-2 h-2 rounded-full ${getStatusGroupColor(status)}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {getStatusGroupLabel(status, customStatuses)}
              </span>
              <span className="text-xs text-gray-400 ml-1">
                {groupTasks.length}
              </span>
            </button>

            {/* Tasks in group */}
            {!isCollapsed && (
              <div>
                {groupTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    customStatuses={customStatuses}
                    onClick={handleTaskClick}
                    onToggleDone={onToggleDone}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
