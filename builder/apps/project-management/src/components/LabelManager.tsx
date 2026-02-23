"use client";

import { useState } from "react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ConfirmModal";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelManagerProps {
  projectId: string;
  initialLabels: Label[];
  canEdit: boolean;
}

const DEFAULT_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#14b8a6",
];

export default function LabelManager({
  projectId,
  initialLabels,
  canEdit,
}: LabelManagerProps) {
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Label | null>(null);

  const handleAddLabel = async () => {
    if (!newName.trim() || isAdding) return;
    setIsAdding(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });

      if (res.ok) {
        const label = await res.json();
        setLabels((prev) => [...prev, label].sort((a, b) => a.name.localeCompare(b.name)));
        setNewName("");
        setNewColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
        toast.success("Label created");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create label");
      }
    } catch {
      toast.error("Failed to create label");
    } finally {
      setIsAdding(false);
    }
  };

  const startEditing = (label: Label) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const handleSaveEdit = async (labelId: string) => {
    if (!editName.trim()) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/labels/${labelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });

      if (res.ok) {
        const updated = await res.json();
        setLabels((prev) =>
          prev
            .map((l) => (l.id === labelId ? { id: updated.id, name: updated.name, color: updated.color } : l))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingId(null);
        toast.success("Label updated");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update label");
      }
    } catch {
      toast.error("Failed to update label");
    }
  };

  const handleDeleteLabel = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/labels/${deleteTarget.id}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setLabels((prev) => prev.filter((l) => l.id !== deleteTarget.id));
        toast.success("Label deleted");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete label");
      }
    } catch {
      toast.error("Failed to delete label");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddLabel();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, labelId: string) => {
    if (e.key === "Enter") handleSaveEdit(labelId);
    if (e.key === "Escape") setEditingId(null);
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Labels ({labels.length})
        </h3>
      </div>

      {/* Label list */}
      <div className="space-y-1 mb-6">
        {labels.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No labels yet. Create labels to organize your tasks.
            </p>
          </div>
        )}
        {labels.map((label) => {
          const isEditing = editingId === label.id;

          return (
            <div
              key={label.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {isEditing ? (
                <>
                  {/* Color picker for editing */}
                  <div className="relative w-6 h-6 flex-shrink-0">
                    <div
                      className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700"
                      style={{ backgroundColor: editColor }}
                    />
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, label.id)}
                    className="flex-1 text-sm px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(label.id)}
                    className="px-2.5 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {/* Color swatch */}
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 border border-gray-200 dark:border-gray-700"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{label.name}</span>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${label.color}1a`,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </span>

                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(label)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Edit label"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(label)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Delete label"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Add label form */}
      {canEdit && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Add Label
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
              placeholder="Label name..."
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              disabled={isAdding}
            />
            <button
              onClick={handleAddLabel}
              disabled={!newName.trim() || isAdding}
              className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAdding ? "Adding..." : "Add Label"}
            </button>
          </div>

          {/* Quick color presets */}
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-xs text-gray-400 mr-1">Quick:</span>
            {DEFAULT_COLORS.map((color) => (
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
        onConfirm={handleDeleteLabel}
        title="Delete Label"
        message={`Are you sure you want to delete the label "${deleteTarget?.name}"? This will remove the label from all tasks.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
