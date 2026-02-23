"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ChannelInfo, UserInfo } from "@/components/ChatLayout";
import EmojiPicker from "@/components/EmojiPicker";

interface Member {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string | null; email: string; avatarUrl?: string | null; avatarColor?: string | null };
}

interface ChannelSettingsModalProps {
  channel: ChannelInfo;
  allUsers: UserInfo[];
  currentUserId: string;
  onClose: () => void;
  onUpdated: (updated: Partial<ChannelInfo> & { id: string }) => void;
}

type Tab = "general" | "members";
type HistoryAccess = "none" | "1day" | "all";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ChannelSettingsModal({
  channel,
  allUsers,
  currentUserId,
  onClose,
  onUpdated,
}: ChannelSettingsModalProps) {
  const [tab, setTab] = useState<Tab>("general");
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || "");
  const [saving, setSaving] = useState(false);
  const [isMuted, setIsMuted] = useState(channel.isMuted || false);
  const [togglingMute, setTogglingMute] = useState(false);

  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [search, setSearch] = useState("");
  const [addingUser, setAddingUser] = useState<UserInfo | null>(null);
  const [historyAccess, setHistoryAccess] = useState<HistoryAccess>("none");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);

  useEffect(() => {
    if (tab === "general") nameRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, tab]);

  // Fetch members when switching to members tab
  useEffect(() => {
    if (tab === "members" && members.length === 0) {
      setLoadingMembers(true);
      fetch(`/api/channels/${channel.id}/members`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setMembers(data);
        })
        .catch(() => toast.error("Failed to load members"))
        .finally(() => setLoadingMembers(false));
    }
  }, [tab, channel.id, members.length]);

  const handleSaveGeneral = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Channel name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update channel");
      }
      toast.success("Channel updated");
      onUpdated({
        id: channel.id,
        name: trimmedName,
        description: description.trim() || null,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update channel");
    } finally {
      setSaving(false);
    }
  };

  const memberIds = new Set(members.map((m) => m.userId));
  const availableUsers = allUsers.filter(
    (u) => u.id !== currentUserId && !memberIds.has(u.id)
  );
  const filteredUsers = search.trim()
    ? availableUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : availableUsers;

  const handleAddMember = async () => {
    if (!addingUser) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: addingUser.id, historyAccess }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add member");
      }
      const member = await res.json();
      setMembers((prev) => [...prev, member]);
      onUpdated({ id: channel.id, memberCount: members.length + 1 });
      toast.success(`${addingUser.name} added to channel`);
      setAddingUser(null);
      setSearch("");
      setHistoryAccess("none");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setRemoving(userId);
    try {
      const res = await fetch(`/api/channels/${channel.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove member");
      }
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      onUpdated({ id: channel.id, memberCount: members.length - 1 });
      toast.success("Member removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Channel Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {(["general", "members"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t === "general" ? "General" : "Members"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto chat-scroll">
          {tab === "general" ? (
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Channel name
                </label>
                <div className="relative flex items-center gap-1">
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    maxLength={50}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmoji(!showEmoji)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                    title="Add emoji"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  {showEmoji && (
                    <EmojiPicker
                      onSelect={(emoji) => {
                        setName((prev) => prev + emoji);
                        setShowEmoji(false);
                        nameRef.current?.focus();
                      }}
                      onClose={() => setShowEmoji(false)}
                      style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        marginTop: 4,
                        zIndex: 60,
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                  <span className="text-gray-400 dark:text-gray-500 font-normal"> (optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this channel about?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  maxLength={200}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSaveGeneral}
                  disabled={saving || !name.trim()}
                  className="px-4 py-2 text-sm font-semibold text-white gradient-brand rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>

              {/* Mute toggle */}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Mute channel</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Hide unread indicators for this channel</p>
                  </div>
                  <button
                    onClick={async () => {
                      setTogglingMute(true);
                      try {
                        const res = await fetch(`/api/channels/${channel.id}/mute`, { method: "POST" });
                        if (!res.ok) throw new Error();
                        const data = await res.json();
                        setIsMuted(data.isMuted);
                        onUpdated({ id: channel.id, isMuted: data.isMuted });
                      } catch {
                        toast.error("Failed to toggle mute");
                      } finally {
                        setTogglingMute(false);
                      }
                    }}
                    disabled={togglingMute}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isMuted ? "bg-purple-600" : "bg-gray-300 dark:bg-gray-600"
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isMuted ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {/* Add member section */}
              {!addingUser ? (
                <div className="mb-4">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users to add..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {search.trim() && filteredUsers.length > 0 && (
                    <div className="mt-1 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => setAddingUser(user)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                          ) : (
                            <div className={`w-7 h-7 rounded-md ${user.avatarColor || "bg-purple-100 dark:bg-purple-900/40"} flex items-center justify-center ${user.avatarColor ? "text-white" : "text-purple-700 dark:text-purple-300"} font-semibold text-xs flex-shrink-0`}>
                              {getInitials(user.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">
                              {user.name}
                            </span>
                            <span className="text-xs text-gray-400 truncate block">{user.email}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {search.trim() && filteredUsers.length === 0 && (
                    <p className="mt-2 text-xs text-gray-400 text-center">No users found</p>
                  )}
                </div>
              ) : (
                <div className="mb-4 p-3 border border-purple-200 dark:border-purple-700 rounded-lg bg-purple-50/50 dark:bg-purple-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {addingUser.avatarUrl ? (
                        <img src={addingUser.avatarUrl} alt={addingUser.name} className="w-7 h-7 rounded-md object-cover" />
                      ) : (
                        <div className={`w-7 h-7 rounded-md ${addingUser.avatarColor || "bg-purple-100 dark:bg-purple-900/40"} flex items-center justify-center ${addingUser.avatarColor ? "text-white" : "text-purple-700 dark:text-purple-300"} font-semibold text-xs`}>
                          {getInitials(addingUser.name)}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {addingUser.name}
                      </span>
                    </div>
                    <button
                      onClick={() => { setAddingUser(null); setHistoryAccess("none"); }}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Share chat history
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {([
                      { value: "none", label: "No history" },
                      { value: "1day", label: "Last 24 hours" },
                      { value: "all", label: "All history" },
                    ] as { value: HistoryAccess; label: string }[]).map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="historyAccess"
                          value={opt.value}
                          checked={historyAccess === opt.value}
                          onChange={() => setHistoryAccess(opt.value)}
                          className="accent-purple-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleAddMember}
                    disabled={adding}
                    className="mt-3 w-full px-3 py-1.5 text-sm font-semibold text-white gradient-brand rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {adding ? "Adding..." : "Add Member"}
                  </button>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-gray-100 dark:border-gray-700 mb-3" />

              {/* Members list */}
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                    {members.length} {members.length === 1 ? "member" : "members"}
                  </p>
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 py-2 px-1"
                    >
                      {member.user.avatarUrl ? (
                        <img src={member.user.avatarUrl} alt={member.user.name || "?"} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className={`w-8 h-8 rounded-lg ${member.user.avatarColor || "bg-purple-100 dark:bg-purple-900/40"} flex items-center justify-center ${member.user.avatarColor ? "text-white" : "text-purple-700 dark:text-purple-300"} font-semibold text-xs flex-shrink-0`}>
                          {getInitials(member.user.name || "?")}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {member.user.name || member.user.email}
                          </span>
                          {member.role === "admin" && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                              Admin
                            </span>
                          )}
                          {member.userId === currentUserId && (
                            <span className="text-xs text-gray-400">(you)</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{member.user.email}</p>
                      </div>
                      {member.userId !== currentUserId && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={removing === member.userId}
                          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
                          title="Remove member"
                        >
                          {removing === member.userId ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
