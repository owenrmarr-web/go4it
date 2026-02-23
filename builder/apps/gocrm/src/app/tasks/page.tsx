"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

interface TaskContact {
  id: string;
  firstName: string;
  lastName: string;
}

interface TaskDeal {
  id: string;
  title: string;
}

interface TaskAssignee {
  id: string;
  name: string | null;
  email: string;
}

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  priority: string;
  completed: boolean;
  completedAt: string | null;
  contact: TaskContact | null;
  deal: TaskDeal | null;
  assignedTo: TaskAssignee | null;
}

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
  isAssigned: boolean;
}

const PRIORITIES = ["HIGH", "MEDIUM", "LOW"];

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-50 text-red-600",
  MEDIUM: "bg-orange-50 text-orange-600",
  LOW: "bg-gray-100 text-gray-500",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (taskDate.getTime() === today.getTime()) return "Today";
  if (taskDate.getTime() === tomorrow.getTime()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function isOverdue(task: TaskData): boolean {
  if (task.completed) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(task.dueDate);
  const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
  return taskDay < today;
}

function isToday(task: TaskData): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const taskDate = new Date(task.dueDate);
  return taskDate >= today && taskDate < tomorrow;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TaskData | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPriority, setFormPriority] = useState("MEDIUM");
  const [formContactId, setFormContactId] = useState("");
  const [formDealId, setFormDealId] = useState("");
  const [formAssignedToId, setFormAssignedToId] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(
          data.map((c: ContactOption) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
          }))
        );
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks?completed=false");
      if (res.ok) {
        const data: TaskData[] = await res.json();
        // Extract unique assignees from tasks
        const uniqueUsers = new Map<string, UserOption>();
        for (const task of data) {
          if (task.assignedTo) {
            uniqueUsers.set(task.assignedTo.id, {
              id: task.assignedTo.id,
              name: task.assignedTo.name,
              email: task.assignedTo.email,
              isAssigned: true,
            });
          }
        }
        setUsers(Array.from(uniqueUsers.values()));
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchContacts();
    fetchUsers();
  }, [fetchTasks, fetchContacts, fetchUsers]);

  const toggleTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });

    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? updated : t))
      );
      toast.success(task.completed ? "Task reopened" : "Task completed");
    } else {
      toast.error("Failed to update task");
    }
  };

  const handleDelete = async (task: TaskData) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      toast.success("Task deleted");
    } else {
      toast.error("Failed to delete task");
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormDueDate("");
    setFormPriority("MEDIUM");
    setFormContactId("");
    setFormDealId("");
    setFormAssignedToId("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    const body: Record<string, unknown> = {
      title: formTitle,
      dueDate: formDueDate,
      priority: formPriority,
    };

    if (formDescription) body.description = formDescription;
    if (formContactId) body.contactId = formContactId;
    if (formDealId) body.dealId = formDealId;
    if (formAssignedToId) body.assignedToId = formAssignedToId;

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const newTask = await res.json();
      setTasks((prev) => [...prev, newTask]);
      toast.success("Task created");
      setShowForm(false);
      resetForm();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create task");
    }
    setFormLoading(false);
  };

  // Filter tasks
  const filtered = tasks.filter((task) => {
    if (priorityFilter && task.priority !== priorityFilter) return false;
    if (assigneeFilter && task.assignedTo?.id !== assigneeFilter) return false;
    return true;
  });

  // Group tasks
  const overdueTasks = filtered
    .filter((t) => isOverdue(t))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const todayTasks = filtered
    .filter((t) => !t.completed && isToday(t) && !isOverdue(t))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const upcomingTasks = filtered
    .filter((t) => {
      if (t.completed) return false;
      if (isOverdue(t)) return false;
      if (isToday(t)) return false;
      return true;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const completedTasks = filtered
    .filter((t) => t.completed)
    .sort((a, b) => {
      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bTime - aTime;
    });

  // Collect unique assignees for filter
  const assigneeOptions = Array.from(
    new Map(
      tasks
        .filter((t) => t.assignedTo)
        .map((t) => [t.assignedTo!.id, t.assignedTo!])
    ).values()
  );

  const TaskRow = ({ task }: { task: TaskData }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-hover-bg group transition-colors">
      {/* Checkbox */}
      <button
        onClick={() => toggleTask(task.id)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          task.completed
            ? "bg-purple-600 border-purple-600"
            : "border-border-default hover:border-purple-400"
        }`}
      >
        {task.completed && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* Title and contact */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            task.completed ? "line-through text-text-faint" : "text-text-primary"
          }`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.contact && (
            <Link
              href={`/contacts/${task.contact.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-purple-600 hover:text-purple-700 hover:underline"
            >
              {task.contact.firstName} {task.contact.lastName}
            </Link>
          )}
          {task.assignedTo && (
            <span className="text-xs text-text-faint">
              {task.contact ? " · " : ""}
              {task.assignedTo.name || task.assignedTo.email}
            </span>
          )}
        </div>
      </div>

      {/* Due date */}
      <span
        className={`text-xs shrink-0 ${
          isOverdue(task)
            ? "text-red-600 font-medium"
            : "text-text-muted"
        }`}
      >
        {formatDate(task.dueDate)}
      </span>

      {/* Overdue badge */}
      {isOverdue(task) && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0">
          Overdue
        </span>
      )}

      {/* Priority badge */}
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
          priorityColors[task.priority] || "bg-gray-100 text-gray-500"
        }`}
      >
        {task.priority}
      </span>

      {/* Delete button */}
      <button
        onClick={() => setDeleteTarget(task)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-faint hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
        title="Delete task"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
          />
        </svg>
      </button>
    </div>
  );

  const SectionHeader = ({
    title,
    count,
    accent,
    collapsible,
    collapsed,
    onToggle,
  }: {
    title: string;
    count: number;
    accent?: string;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggle?: () => void;
  }) => (
    <div
      className={`flex items-center gap-2 mb-2 ${
        collapsible ? "cursor-pointer select-none" : ""
      }`}
      onClick={collapsible ? onToggle : undefined}
    >
      {collapsible && (
        <svg
          className={`w-4 h-4 text-text-faint transition-transform ${
            collapsed ? "" : "rotate-90"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
      <h3 className={`text-sm font-semibold ${accent || "text-text-secondary"}`}>
        {title}
      </h3>
      <span className="text-xs text-text-faint bg-hover-bg px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Tasks</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm"
        >
          + Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input-border bg-input-bg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input-border bg-input-bg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
        >
          <option value="">All Assignees</option>
          {assigneeOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.email}
            </option>
          ))}
        </select>
      </div>

      {/* Task sections */}
      {filtered.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-12 text-center">
          <svg
            className="w-12 h-12 text-text-faint mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-text-muted mb-3">No tasks yet</p>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm"
          >
            Create your first task
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <div className="bg-surface rounded-xl border border-red-100 shadow-sm p-4">
              <SectionHeader
                title="Overdue"
                count={overdueTasks.length}
                accent="text-red-600"
              />
              <div className="divide-y divide-border-subtle">
                {overdueTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Today */}
          <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-4">
            <SectionHeader title="Today" count={todayTasks.length} />
            {todayTasks.length === 0 ? (
              <p className="text-sm text-text-faint py-3 px-3">
                No tasks due today
              </p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {todayTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-4">
            <SectionHeader title="Upcoming" count={upcomingTasks.length} />
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-text-faint py-3 px-3">
                No upcoming tasks
              </p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {upcomingTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>

          {/* Completed */}
          {completedTasks.length > 0 && (
            <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-4">
              <SectionHeader
                title="Completed"
                count={completedTasks.length}
                accent="text-text-muted"
                collapsible
                collapsed={!showCompleted}
                onToggle={() => setShowCompleted(!showCompleted)}
              />
              {showCompleted && (
                <div className="divide-y divide-border-subtle">
                  {completedTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Task Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="New Task"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Title *
            </label>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
              placeholder="e.g., Follow up with client"
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Description
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              placeholder="Add details..."
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                required
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Priority
              </label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Contact
              </label>
              <select
                value={formContactId}
                onChange={(e) => setFormContactId(e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              >
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Assigned To
              </label>
              <select
                value={formAssignedToId}
                onChange={(e) => setFormAssignedToId(e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                    {!u.isAssigned ? " (Not on plan)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-text-secondary bg-hover-bg rounded-lg hover:bg-hover-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm disabled:opacity-50"
            >
              {formLoading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
