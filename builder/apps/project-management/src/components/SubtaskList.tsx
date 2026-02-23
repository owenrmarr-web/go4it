"use client";

import { useState, useRef } from "react";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  taskId: string;
}

interface SubtaskListProps {
  projectId: string;
  taskId: string;
  initialSubtasks: Subtask[];
}

export default function SubtaskList({
  projectId,
  taskId,
  initialSubtasks,
}: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const basePath = `/api/projects/${projectId}/tasks/${taskId}/subtasks`;

  const addSubtask = async () => {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        const subtask = await res.json();
        setSubtasks((prev) => [...prev, subtask]);
        setNewTitle("");
      }
    } catch (error) {
      console.error("Add subtask error:", error);
    } finally {
      setAdding(false);
    }
  };

  const toggleCompleted = async (subtask: Subtask) => {
    // Optimistic update
    const newCompleted = !subtask.completed;
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtask.id ? { ...s, completed: newCompleted } : s))
    );

    try {
      const res = await fetch(`${basePath}/${subtask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: newCompleted }),
      });
      if (!res.ok) {
        // Revert on failure
        setSubtasks((prev) =>
          prev.map((s) => (s.id === subtask.id ? { ...s, completed: subtask.completed } : s))
        );
      }
    } catch {
      // Revert on error
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtask.id ? { ...s, completed: subtask.completed } : s))
      );
    }
  };

  const startEditing = (subtask: Subtask) => {
    setEditingId(subtask.id);
    setEditTitle(subtask.title);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const saveEdit = async (subtaskId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    const prev = subtasks.find((s) => s.id === subtaskId);
    if (prev && editTitle.trim() === prev.title) {
      setEditingId(null);
      return;
    }

    setSubtasks((list) =>
      list.map((s) => (s.id === subtaskId ? { ...s, title: editTitle.trim() } : s))
    );
    setEditingId(null);

    try {
      await fetch(`${basePath}/${subtaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
    } catch (error) {
      console.error("Edit subtask error:", error);
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    try {
      await fetch(`${basePath}/${subtaskId}`, { method: "DELETE" });
    } catch (error) {
      console.error("Delete subtask error:", error);
    }
  };

  return (
    <div>
      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>
              {completedCount}/{totalCount} completed
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-center gap-2 group py-1 px-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <input
              type="checkbox"
              checked={subtask.completed}
              onChange={() => toggleCompleted(subtask)}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-400 flex-shrink-0 cursor-pointer"
            />

            {editingId === subtask.id ? (
              <input
                ref={editInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => saveEdit(subtask.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(subtask.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="flex-1 text-sm border-b border-purple-300 outline-none py-0.5 bg-transparent"
              />
            ) : (
              <span
                onClick={() => startEditing(subtask)}
                className={`flex-1 text-sm cursor-pointer ${
                  subtask.completed ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {subtask.title}
              </span>
            )}

            <button
              onClick={() => deleteSubtask(subtask.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-0.5"
              title="Delete subtask"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add new subtask */}
      <div className="mt-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addSubtask();
          }}
          placeholder="Add subtask"
          disabled={adding}
          className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none placeholder-gray-400 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
