"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { DMInfo, UserInfo } from "@/components/ChatLayout";

interface NewDMModalProps {
  onClose: () => void;
  onCreated: (dm: DMInfo) => void;
  allUsers: UserInfo[];
  currentUserId: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function PresenceDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    offline: "bg-gray-400",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status] || colors.offline}`}
    />
  );
}

export default function NewDMModal({
  onClose,
  onCreated,
  allUsers,
  currentUserId,
}: NewDMModalProps) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const otherUsers = allUsers.filter((u) => u.id !== currentUserId);
  const filtered = search.trim()
    ? otherUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : otherUsers;

  const handleSelect = async (user: UserInfo) => {
    setCreating(user.id);
    try {
      const res = await fetch("/api/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onCreated({
        id: data.dm.id,
        otherUser: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        lastMessage: null,
        hasUnread: false,
      });
      onClose();
    } catch {
      toast.error("Failed to start conversation");
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            New message
          </h2>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="max-h-80 overflow-y-auto chat-scroll">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">
                {search.trim() ? "No users found" : "No team members available"}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  disabled={creating === user.id}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className={`w-9 h-9 rounded-lg ${user.avatarColor || "bg-purple-100 dark:bg-purple-900/40"} flex items-center justify-center ${user.avatarColor ? "text-white" : "text-purple-700 dark:text-purple-300"} font-semibold text-xs flex-shrink-0`}>
                      {getInitials(user.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user.name}
                      </span>
                      <PresenceDot status={user.presence} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                  {creating === user.id && (
                    <svg className="w-4 h-4 text-purple-500 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
