"use client";

import { useState } from "react";
import { toast } from "sonner";

interface TaskItem {
  id: string;
  title: string;
  priority: string;
  completed: boolean;
  contact: { firstName: string; lastName: string } | null;
  deal: { title: string } | null;
}

export default function DashboardClient({ tasks }: { tasks: TaskItem[] }) {
  const [items, setItems] = useState(tasks);

  const toggleTask = async (taskId: string) => {
    const task = items.find((t) => t.id === taskId);
    if (!task) return;

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });

    if (res.ok) {
      setItems((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        )
      );
      toast.success(task.completed ? "Task reopened" : "Task completed");
    }
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-text-faint text-center py-8">
        No tasks due today
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((task) => {
        const priorityColors: Record<string, string> = {
          HIGH: "text-red-600",
          MEDIUM: "text-orange-600",
          LOW: "text-text-muted",
        };
        return (
          <div
            key={task.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-hover-bg"
          >
            <button
              onClick={() => toggleTask(task.id)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                task.completed
                  ? "bg-purple-600 border-purple-600"
                  : "border-text-faint hover:border-purple-400"
              }`}
            >
              {task.completed && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${task.completed ? "line-through text-text-faint" : "text-text-primary"}`}>
                {task.title}
              </p>
              {task.contact && (
                <p className="text-xs text-text-muted">
                  {task.contact.firstName} {task.contact.lastName}
                  {task.deal && ` · ${task.deal.title}`}
                </p>
              )}
            </div>
            <span className={`text-xs font-medium ${priorityColors[task.priority] || ""}`}>
              {task.priority}
            </span>
          </div>
        );
      })}
    </div>
  );
}
