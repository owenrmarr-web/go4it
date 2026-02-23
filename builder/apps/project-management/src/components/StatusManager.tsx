"use client";

import { useState } from "react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ConfirmModal";

interface CustomStatus {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface StatusManagerProps {
  projectId: string;
  initialStatuses: CustomStatus[];
  canEdit: boolean;
}

const BUILT_IN_STATUSES = [
  { name: "To Do", key: "todo", color: "#6b7280" },
  { name: "In Progress", key: "in-progress", color: "#3b82f6" },
  { name: "Done", key: "done", color: "#22c55e" },
];

const DEFAULT_STATUS_COLORS = [
  "#f97316", "#eab308", "#06b6d4", "#8b5cf6", "#ec4899",
  "#14b8a6", "#ef4444", "#6366f1", "#84cc16", "#f43f5e",
];

export default function StatusManager({
  projectId,
  initialStatuses,
  canEdit,
}: StatusManagerProps) {
  const [statuses, setStatuses] = useState<CustomStatus[]>(initialStatuses);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_STATUS_COLORS[0]);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomStatus | null>(null);

  const handleAddStatus = async () => {
    if (!newName.trim() || isAdding) return;
    setIsAdding(true);

    const nextPosition = statuses.length > 0
      ? Math.max(...statuses.map((s) => s.position)) + 1
      : 0;

    try {
      const res = await fetch(`/api/projects/${projectId}/statuses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          color: newColor,
          position: nextPosition,
        }),
      });

      if (res.ok) {
        const status = await res.json();
        setStatuses((prev) => [...prev, status]);
        setNewName("");
        setNewColor(DEFAULT_STATUS_COLORS[Math.floor(Math.random() * DEFAULT_STATUS_COLORS.length)]);
        toast.success("Status created");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create status");
      }
    } catch {
      toast.error("Failed to create status");
    } finally {
      setIsAdding(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newStatuses = [...statuses];
    const current = newStatuses[index];
    const above = newStatuses[index - 1];

    // Swap positions
    const tempPos = current.position;
    current.position = above.position;
    above.position = tempPos;

    // Swap in array
    newStatuses[index] = above;
    newStatuses[index - 1] = current;
    setStatuses(newStatuses);

    // Update both on server
    try {
      await Promise.all([
        fetch(`/api/projects/${projectId}/statuses/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: current.position }),
        }),
        fetch(`/api/projects/${projectId}/statuses/${above.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: above.position }),
        }),
      ]);
    } catch {
      toast.error("Failed to reorder");
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === statuses.length - 1) return;
    const newStatuses = [...statuses];
    const current = newStatuses[index];
    const below = newStatuses[index + 1];

    // Swap positions
    const tempPos = current.position;
    current.position = below.position;
    below.position = tempPos;

    // Swap in array
    newStatuses[index] = below;
    newStatuses[index + 1] = current;
    setStatuses(newStatuses);

    // Update both on server
    try {
      await Promise.all([
        fetch(`/api/projects/${projectId}/statuses/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: current.position }),
        }),
        fetch(`/api/projects/${projectId}/statuses/${below.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: below.position }),
        }),
      ]);
    } catch {
      toast.error("Failed to reorder");
    }
  };

  const handleDeleteStatus = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/statuses/${deleteTarget.id}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setStatuses((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        toast.success("Status deleted");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete status");
      }
    } catch {
      toast.error("Failed to delete status");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddStatus();
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Task Statuses</h3>
      </div>

      {/* Built-in statuses */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Built-in
        </h4>
        <div className="space-y-1">
          {BUILT_IN_STATUSES.map((status) => (
            <div
              key={status.key}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: status.color }}
              />
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{status.name}</span>
              <span className="text-xs text-gray-400">Default</span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom statuses */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Custom ({statuses.length})
        </h4>
        {statuses.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No custom statuses. Add your own workflow stages.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {statuses.map((status, index) => (
              <div
                key={status.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-200 dark:border-gray-700"
                  style={{ backgroundColor: status.color }}
                />
                <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{status.name}</span>

                {/* Preview badge */}
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${status.color}1a`,
                    color: status.color,
                  }}
                >
                  {status.name}
                </span>

                {canEdit && (
                  <div className="flex items-center gap-0.5">
                    {/* Move up */}
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Move up"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    {/* Move down */}
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === statuses.length - 1}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Move down"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => setDeleteTarget(status)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1"
                      aria-label="Delete status"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add status form */}
      {canEdit && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Add Custom Status
          </h4>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Color picker */}
            <div className="relative w-10 h-10 flex-shrink-0 self-center sm:self-auto">
              <div
                className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                style={{ backgroundColor: newColor }}
              />
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Status name..."
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              disabled={isAdding}
            />
            <button
              onClick={handleAddStatus}
              disabled={!newName.trim() || isAdding}
              className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAdding ? "Adding..." : "Add Status"}
            </button>
          </div>

          {/* Quick color presets */}
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-xs text-gray-400 mr-1">Quick:</span>
            {DEFAULT_STATUS_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  newColor === color ? "border-gray-900 scale-110" : "border-transparent hover:scale-110"
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteStatus}
        title="Delete Status"
        message={`Are you sure you want to delete the status "${deleteTarget?.name}"? Tasks with this status will need to be updated manually.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
