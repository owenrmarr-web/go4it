"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import UserAvatar from "@/components/UserAvatar";
import SubtaskList from "@/components/SubtaskList";
import CommentSection from "@/components/CommentSection";
import AttachmentList from "@/components/AttachmentList";
import WatcherList from "@/components/WatcherList";
import ActivityLog from "@/components/ActivityLog";

// ------- Type definitions -------

interface TaskUser {
  id: string;
  name: string | null;
  email: string;
}

interface SubtaskData {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  taskId: string;
}

interface CommentData {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  user: TaskUser;
  createdAt: string;
}

interface AttachmentData {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  taskId: string;
  createdAt: string;
}

interface WatcherData {
  id: string;
  taskId: string;
  userId: string;
  user: TaskUser;
}

interface ActivityData {
  id: string;
  type: string;
  detail: string | null;
  taskId: string | null;
  projectId: string | null;
  userId: string;
  user: TaskUser;
  createdAt: string;
}

interface LabelData {
  id: string;
  name: string;
  color: string;
}

interface TaskLabelData {
  labelId: string;
  label: LabelData;
}

interface MilestoneData {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  status: string;
}

interface MemberData {
  id: string;
  role: string;
  userId: string;
  user: TaskUser;
}

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  estimate: number | null;
  position: number;
  projectId: string;
  milestoneId: string | null;
  assigneeId: string | null;
  userId: string;
  subtasks: SubtaskData[];
  comments: CommentData[];
  attachments: AttachmentData[];
  watchers: WatcherData[];
  activities: ActivityData[];
  labels: TaskLabelData[];
  assignee: TaskUser | null;
  user: TaskUser;
  milestone: MilestoneData | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskDetailProps {
  task: TaskData;
  projectId: string;
  currentUserId: string;
  members: MemberData[];
  labels: LabelData[];
  milestones: MilestoneData[];
}

// ------- Constants -------

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do", color: "bg-gray-100 text-gray-700" },
  { value: "in-progress", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { value: "in-review", label: "In Review", color: "bg-yellow-100 text-yellow-700" },
  { value: "done", label: "Done", color: "bg-green-100 text-green-700" },
];

function getStatusDisplay(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
}

// ------- Component -------

export default function TaskDetail({
  task: initialTask,
  projectId,
  currentUserId,
  members,
  labels,
  milestones,
}: TaskDetailProps) {
  const router = useRouter();
  const [task, setTask] = useState<TaskData>(initialTask);

  // Inline edit states
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [descriptionDraft, setDescriptionDraft] = useState(task.description || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const taskApiPath = `/api/projects/${projectId}/tasks/${task.id}`;

  // ------- Polling -------

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(taskApiPath);
      if (res.ok) {
        const data = await res.json();
        setTask(data);
      }
    } catch {
      // Silently fail polling
    }
  }, [taskApiPath]);

  useEffect(() => {
    const interval = setInterval(fetchTask, 3000);
    return () => clearInterval(interval);
  }, [fetchTask]);

  // ------- Update helpers -------

  const updateTask = async (fields: Record<string, unknown>) => {
    try {
      const res = await fetch(taskApiPath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        // Refetch full task data after update
        await fetchTask();
        return true;
      } else {
        const err = await res.json();
        toast.error(err.error || "Update failed");
        return false;
      }
    } catch {
      toast.error("Update failed");
      return false;
    }
  };

  // ------- Title editing -------

  const saveTitle = async () => {
    if (!titleDraft.trim()) {
      setTitleDraft(task.title);
      setEditingTitle(false);
      return;
    }
    if (titleDraft.trim() === task.title) {
      setEditingTitle(false);
      return;
    }
    const success = await updateTask({ title: titleDraft.trim() });
    if (success) {
      setEditingTitle(false);
    }
  };

  // ------- Description auto-save -------

  const saveDescription = async () => {
    const newDesc = descriptionDraft.trim() || null;
    if (newDesc === (task.description || null)) return;
    await updateTask({ description: newDesc });
  };

  // ------- Status change -------

  const changeStatus = async (newStatus: string) => {
    setStatusDropdownOpen(false);
    if (newStatus === task.status) return;
    // Optimistic
    setTask((prev) => ({ ...prev, status: newStatus }));
    await updateTask({ status: newStatus });
  };

  // ------- Assignee change -------

  const changeAssignee = async (newAssigneeId: string) => {
    const assigneeId = newAssigneeId || null;
    setTask((prev) => ({
      ...prev,
      assigneeId,
      assignee: assigneeId
        ? members.find((m) => m.user.id === assigneeId)?.user || null
        : null,
    }));
    await updateTask({ assigneeId });
  };

  // ------- Start date change -------

  const changeStartDate = async (dateStr: string) => {
    const startDate = dateStr || null;
    setTask((prev) => ({ ...prev, startDate }));
    await updateTask({ startDate });
  };

  // ------- Due date change -------

  const changeDueDate = async (dateStr: string) => {
    const dueDate = dateStr || null;
    setTask((prev) => ({ ...prev, dueDate }));
    await updateTask({ dueDate });
  };

  // ------- Estimate change -------

  const changeEstimate = async (val: string) => {
    const estimate = val ? parseFloat(val) : null;
    setTask((prev) => ({ ...prev, estimate }));
    await updateTask({ estimate });
  };

  // ------- Milestone change -------

  const changeMilestone = async (newMilestoneId: string) => {
    const milestoneId = newMilestoneId || null;
    setTask((prev) => ({
      ...prev,
      milestoneId,
      milestone: milestoneId
        ? milestones.find((m) => m.id === milestoneId) || null
        : null,
    }));
    await updateTask({ milestoneId });
  };

  // ------- Label toggle -------

  const toggleLabel = async (labelId: string) => {
    const currentIds = task.labels.map((tl) => tl.labelId);
    const newIds = currentIds.includes(labelId)
      ? currentIds.filter((id) => id !== labelId)
      : [...currentIds, labelId];

    // Optimistic
    setTask((prev) => ({
      ...prev,
      labels: newIds.map((id) => {
        const existing = prev.labels.find((tl) => tl.labelId === id);
        if (existing) return existing;
        const label = labels.find((l) => l.id === id);
        return { labelId: id, label: label! };
      }),
    }));

    await updateTask({ labelIds: newIds });
  };

  // ------- Delete task -------

  const deleteTask = async () => {
    try {
      const res = await fetch(taskApiPath, { method: "DELETE" });
      if (res.ok) {
        toast.success("Task deleted");
        router.push(`/projects/${projectId}`);
      } else {
        toast.error("Failed to delete task");
      }
    } catch {
      toast.error("Failed to delete task");
    }
  };

  // ------- Render -------

  const statusDisplay = getStatusDisplay(task.status);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors mb-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to project
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* Title */}
          <div className="flex-1">
            {editingTitle ? (
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setTitleDraft(task.title);
                    setEditingTitle(false);
                  }
                }}
                autoFocus
                className="text-2xl font-bold text-gray-900 dark:text-white w-full border-b-2 border-purple-400 outline-none bg-transparent pb-1"
              />
            ) : (
              <h1
                onClick={() => {
                  setTitleDraft(task.title);
                  setEditingTitle(true);
                }}
                className="text-2xl font-bold text-gray-900 dark:text-white cursor-pointer hover:text-purple-700 dark:hover:text-purple-400 transition-colors"
                title="Click to edit"
              >
                {task.title}
              </h1>
            )}
          </div>

          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusDisplay.color} transition-colors`}
            >
              {statusDisplay.label}
              <svg className="w-3.5 h-3.5 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {statusDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setStatusDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1 z-20 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg py-1 min-w-[140px]">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => changeStatus(opt.value)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        task.status === opt.value ? "font-medium text-purple-700 dark:text-purple-400" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Created by */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Created by {task.user.name || task.user.email} on{" "}
          {new Date(task.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Main layout: left column + right sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column */}
        <div className="flex-1 space-y-6">
          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
            <textarea
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              onBlur={saveDescription}
              placeholder="Add a description..."
              rows={4}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none resize-none placeholder-gray-400"
            />
          </div>

          {/* Subtasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Subtasks</h3>
            <SubtaskList
              projectId={projectId}
              taskId={task.id}
              initialSubtasks={task.subtasks}
            />
          </div>

          {/* Attachments */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Attachments</h3>
            <AttachmentList
              projectId={projectId}
              taskId={task.id}
              initialAttachments={task.attachments}
            />
          </div>

          {/* Comments */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Comments</h3>
            <CommentSection
              projectId={projectId}
              taskId={task.id}
              initialComments={task.comments}
            />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-full lg:w-72 space-y-5">
          {/* Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Status</label>
            <select
              value={task.status}
              onChange={(e) => changeStatus(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Assignee</label>
            <select
              value={task.assigneeId || ""}
              onChange={(e) => changeAssignee(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name || m.user.email}
                </option>
              ))}
            </select>
            {task.assignee && (
              <div className="flex items-center gap-2 mt-2">
                <UserAvatar
                  name={task.assignee.name || task.assignee.email}
                  size="sm"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {task.assignee.name || task.assignee.email}
                </span>
              </div>
            )}
          </div>

          {/* Start Date */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Start Date</label>
            <input
              type="date"
              value={task.startDate ? new Date(task.startDate).toISOString().split("T")[0] : ""}
              onChange={(e) => changeStartDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-sm"
            />
            {task.startDate && (
              <button
                onClick={() => changeStartDate("")}
                className="text-xs text-gray-400 hover:text-red-500 mt-1 transition-colors"
              >
                Clear date
              </button>
            )}
          </div>

          {/* Due Date */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Due Date</label>
            <input
              type="date"
              value={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""}
              onChange={(e) => changeDueDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-sm"
            />
            {task.dueDate && (
              <button
                onClick={() => changeDueDate("")}
                className="text-xs text-gray-400 hover:text-red-500 mt-1 transition-colors"
              >
                Clear date
              </button>
            )}
          </div>

          {/* Estimate */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Estimate (hours)
            </label>
            <input
              type="number"
              value={task.estimate != null ? task.estimate : ""}
              onChange={(e) => changeEstimate(e.target.value)}
              placeholder="0"
              min="0"
              step="0.5"
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-sm"
            />
          </div>

          {/* Milestone */}
          {milestones.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Milestone</label>
              <select
                value={task.milestoneId || ""}
                onChange={(e) => changeMilestone(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="">No milestone</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Labels */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Labels</label>
            {labels.length === 0 ? (
              <p className="text-xs text-gray-400">No labels available</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {labels.map((label) => {
                  const isSelected = task.labels.some((tl) => tl.labelId === label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all border ${
                        isSelected
                          ? "ring-2 ring-purple-400 border-transparent"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? label.color + "30"
                          : label.color + "15",
                        color: label.color,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Watchers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Watchers</label>
            <WatcherList
              projectId={projectId}
              taskId={task.id}
              initialWatchers={task.watchers}
              currentUserId={currentUserId}
            />
          </div>

          {/* Delete task */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            {showDeleteConfirm ? (
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Are you sure you want to delete this task? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={deleteTask}
                    className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Task
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log (bottom) */}
      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Activity</h3>
        <ActivityLog activities={task.activities} />
      </div>
    </div>
  );
}
