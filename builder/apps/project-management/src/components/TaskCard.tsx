"use client";

import StatusBadge from "@/components/StatusBadge";
import LabelBadge from "@/components/LabelBadge";

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
  assignee: Assignee | null;
  labels: TaskLabel[];
}

interface TaskCardProps {
  task: Task;
  customStatuses: CustomStatus[];
  onClick: (taskId: string) => void;
  onToggleDone?: (taskId: string, currentStatus: string) => void;
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function formatDueDate(dueDate: string): string {
  const date = new Date(dueDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TaskCard({
  task,
  customStatuses,
  onClick,
  onToggleDone,
}: TaskCardProps) {
  const isDone = task.status === "done";
  const overdue = task.dueDate && !isDone && isOverdue(task.dueDate);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
      onClick={() => onClick(task.id)}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone?.(task.id, task.status);
        }}
        className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          isDone
            ? "bg-green-500 border-green-500"
            : "border-gray-300 dark:border-gray-600 hover:border-purple-400"
        }`}
        aria-label={isDone ? "Mark as not done" : "Mark as done"}
      >
        {isDone && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Title */}
      <span
        className={`flex-1 text-sm truncate ${
          isDone ? "text-gray-400 line-through" : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {task.title}
      </span>

      {/* Status badge */}
      <StatusBadge status={task.status} customStatuses={customStatuses} />

      {/* Assignee avatar */}
      {task.assignee && (
        <div
          className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0"
          title={task.assignee.name || task.assignee.email}
        >
          <span className="text-xs font-semibold text-purple-700">
            {(task.assignee.name || task.assignee.email || "U").charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Due date */}
      {task.dueDate && (
        <span
          className={`text-xs flex-shrink-0 ${
            overdue ? "text-red-600 font-medium" : "text-gray-400"
          }`}
        >
          {formatDueDate(task.dueDate)}
        </span>
      )}

      {/* Labels */}
      <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
        {task.labels.slice(0, 2).map((tl) => (
          <LabelBadge key={tl.label.id} name={tl.label.name} color={tl.label.color} />
        ))}
        {task.labels.length > 2 && (
          <span className="text-xs text-gray-400">+{task.labels.length - 2}</span>
        )}
      </div>

      {/* Estimate */}
      {task.estimate != null && (
        <span className="text-xs text-gray-400 flex-shrink-0 hidden md:inline">
          {task.estimate}h
        </span>
      )}
    </div>
  );
}
