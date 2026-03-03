"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface OrgMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    image: string | null;
  };
}

export interface MemberConfig {
  userId: string;
  role: string;
}

interface DeployConfigModalProps {
  orgSlug: string;
  orgName: string;
  appTitle: string;
  onConfirm: (members: MemberConfig[]) => void;
  onClose: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function DeployConfigModal({
  orgSlug,
  orgName,
  appTitle,
  onConfirm,
  onClose,
}: DeployConfigModalProps) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/organizations/${orgSlug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          const m: OrgMember[] = data.members || [];
          setMembers(m);
          setSelected(new Set(m.map((member) => member.user.id)));
          // Default all to "MEMBER" app role
          const defaultRoles: Record<string, string> = {};
          m.forEach((member) => {
            defaultRoles[member.user.id] = "MEMBER";
          });
          setRoles(defaultRoles);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load team members");
        setLoading(false);
      });
  }, [orgSlug]);

  const toggleMember = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const setMemberRole = (userId: string, role: string) => {
    setRoles((prev) => ({ ...prev, [userId]: role }));
  };

  const handleConfirm = () => {
    const memberConfig = Array.from(selected).map((userId) => ({
      userId,
      role: roles[userId] || "MEMBER",
    }));
    onConfirm(memberConfig);
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <h2 className="text-xl font-bold text-gray-900">Configure Access</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select team members who will have access to {appTitle}.
        </p>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        )}

        {/* Member list */}
        {!loading && !error && (
          <div className="mt-5 flex-1 overflow-y-auto min-h-0 space-y-1 border border-gray-100 rounded-xl p-3">
            {/* Column headers */}
            <div className="flex items-center gap-4 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <span className="w-5" />
              <span className="w-10" />
              <span className="flex-1">Team Member</span>
              <span className="w-28 text-right">App Role</span>
            </div>
            {members.map((member) => {
              const userId = member.user.id;
              const isSelected = selected.has(userId);
              return (
                <div
                  key={userId}
                  className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-colors cursor-pointer ${
                    isSelected ? "bg-purple-50/60 hover:bg-purple-50" : "hover:bg-gray-50 opacity-60"
                  }`}
                  onClick={() => toggleMember(userId)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMember(userId)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-400 cursor-pointer"
                  />
                  {/* Avatar */}
                  {member.user.image ? (
                    <img
                      src={member.user.image}
                      alt={member.user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                      {getInitials(member.user.name)}
                    </div>
                  )}
                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.user.name}
                    </p>
                    {member.user.email && (
                      <p className="text-xs text-gray-500 truncate">
                        {member.user.email}
                      </p>
                    )}
                  </div>
                  {/* Role dropdown */}
                  <select
                    value={roles[userId] || "MEMBER"}
                    onChange={(e) => setMemberRole(userId, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={!isSelected}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-40 disabled:cursor-not-allowed bg-white w-28"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              );
            })}
          </div>
        )}

        {/* Deploy button */}
        {!loading && !error && (
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="mt-6 w-full gradient-brand py-3 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            Deploy to {orgName}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
