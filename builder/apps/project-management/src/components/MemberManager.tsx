"use client";

import { useState } from "react";
import { toast } from "sonner";
import UserAvatar from "@/components/UserAvatar";
import ConfirmModal from "@/components/ConfirmModal";

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

interface MemberManagerProps {
  projectId: string;
  initialMembers: Member[];
  canEdit: boolean;
  currentUserId: string;
}

const ROLES = ["owner", "admin", "member", "viewer"] as const;

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export default function MemberManager({
  projectId,
  initialMembers,
  canEdit,
  currentUserId,
}: MemberManagerProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [email, setEmail] = useState("");
  const [addRole, setAddRole] = useState("member");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const handleAddMember = async () => {
    if (!email.trim() || isAdding) return;
    setIsAdding(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role: addRole }),
      });

      if (res.ok) {
        const newMember = await res.json();
        setMembers((prev) => [...prev, newMember]);
        setEmail("");
        toast.success("Member added successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add member");
      }
    } catch {
      toast.error("Failed to add member");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const prev = members.find((m) => m.id === memberId);
    if (!prev) return;

    // Optimistic update
    setMembers((ms) =>
      ms.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );

    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        toast.success("Role updated");
      } else {
        // Revert
        setMembers((ms) =>
          ms.map((m) => (m.id === memberId ? { ...m, role: prev.role } : m))
        );
        const data = await res.json();
        toast.error(data.error || "Failed to update role");
      }
    } catch {
      // Revert
      setMembers((ms) =>
        ms.map((m) => (m.id === memberId ? { ...m, role: prev.role } : m))
      );
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/members/${deleteTarget.id}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setMembers((ms) => ms.filter((m) => m.id !== deleteTarget.id));
        toast.success("Member removed");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to remove member");
      }
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddMember();
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Team Members ({members.length})
        </h3>
      </div>

      {/* Member list */}
      <div className="space-y-1 mb-6">
        {members.map((member) => {
          const displayName = member.user.name || member.user.email;
          const isCurrentUser = member.userId === currentUserId;

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <UserAvatar name={displayName} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {displayName}
                  {isCurrentUser && (
                    <span className="text-xs text-gray-400 ml-1.5">(you)</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.user.email}</p>
              </div>

              {/* Role dropdown */}
              {canEdit && !isCurrentUser ? (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 text-xs px-2 py-1.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1.5">
                  {roleLabels[member.role] || member.role}
                </span>
              )}

              {/* Remove button */}
              {canEdit && !isCurrentUser && (
                <button
                  onClick={() => setDeleteTarget(member)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  aria-label="Remove member"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add member form */}
      {canEdit && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Add Member
          </h4>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Email address..."
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              disabled={isAdding}
            />
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 text-sm px-2.5 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {ROLES.filter((r) => r !== "owner").map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddMember}
              disabled={!email.trim() || isAdding}
              className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAdding ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {members.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">No members in this project yet.</p>
        </div>
      )}

      {/* Confirm delete modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={`Are you sure you want to remove ${
          deleteTarget?.user.name || deleteTarget?.user.email || "this member"
        } from the project?`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
