"use client";

import { useState } from "react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ConfirmModal";
import LabelBadge from "@/components/LabelBadge";

interface Member {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface AssignRule {
  id: string;
  labelId: string;
  assignToId: string;
  label: { id: string; name: string; color: string } | null;
  assignee: { id: string; name: string | null; email: string } | null;
}

interface RuleManagerProps {
  projectId: string;
  initialRules: AssignRule[];
  members: Member[];
  labels: Label[];
  canEdit: boolean;
}

export default function RuleManager({
  projectId,
  initialRules,
  members,
  labels,
  canEdit,
}: RuleManagerProps) {
  const [rules, setRules] = useState<AssignRule[]>(initialRules);
  const [selectedLabelId, setSelectedLabelId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssignRule | null>(null);

  const handleAddRule = async () => {
    if (!selectedLabelId || !selectedMemberId || isAdding) return;
    setIsAdding(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labelId: selectedLabelId,
          assignToId: selectedMemberId,
        }),
      });

      if (res.ok) {
        const newRule = await res.json();
        // Enrich with label and assignee info for display
        const label = labels.find((l) => l.id === selectedLabelId);
        const member = members.find((m) => m.user.id === selectedMemberId);
        const enrichedRule: AssignRule = {
          id: newRule.id,
          labelId: newRule.labelId,
          assignToId: newRule.assignToId,
          label: label ? { id: label.id, name: label.name, color: label.color } : null,
          assignee: member ? member.user : null,
        };
        setRules((prev) => [...prev, enrichedRule]);
        setSelectedLabelId("");
        setSelectedMemberId("");
        toast.success("Rule created");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create rule");
      }
    } catch {
      toast.error("Failed to create rule");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/rules/${deleteTarget.id}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        toast.success("Rule deleted");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete rule");
      }
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Auto-Assign Rules ({rules.length})
        </h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        When a task receives a specific label, it will automatically be assigned to the
        designated team member.
      </p>

      {/* Rule list */}
      <div className="space-y-1 mb-6">
        {rules.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No auto-assign rules yet. Create a rule to automate task assignment.
            </p>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700"
            >
              <span className="text-xs text-gray-400 flex-shrink-0">When label</span>
              {rule.label ? (
                <LabelBadge name={rule.label.name} color={rule.label.color} />
              ) : (
                <span className="text-xs text-gray-400 italic">Unknown label</span>
              )}
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="text-xs text-gray-400 flex-shrink-0">assign to</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {rule.assignee?.name || rule.assignee?.email || "Unknown user"}
              </span>

              {canEdit && (
                <button
                  onClick={() => setDeleteTarget(rule)}
                  className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                  aria-label="Delete rule"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add rule form */}
      {canEdit && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Add Rule
          </h4>
          {labels.length === 0 || members.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {labels.length === 0
                ? "Create labels first to set up auto-assign rules."
                : "Add members first to set up auto-assign rules."}
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  When label is
                </label>
                <select
                  value={selectedLabelId}
                  onChange={(e) => setSelectedLabelId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 text-sm px-2.5 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">Select label...</option>
                  {labels.map((label) => (
                    <option key={label.id} value={label.id}>
                      {label.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Assign to
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 text-sm px-2.5 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">Select member...</option>
                  {members.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.name || member.user.email}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAddRule}
                disabled={!selectedLabelId || !selectedMemberId || isAdding}
                className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAdding ? "Adding..." : "Add Rule"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirm delete modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteRule}
        title="Delete Rule"
        message="Are you sure you want to delete this auto-assign rule?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
