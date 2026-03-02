"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import type { ChannelInfo, DMInfo, CurrentUser, UserInfo, TypingUser } from "@/components/ChatLayout";
import MessageBubble, { type MessageData } from "@/components/MessageBubble";
import MessageInput from "@/components/MessageInput";
import PinnedMessagesPanel from "@/components/PinnedMessagesPanel";
import ThreadPanel from "@/components/ThreadPanel";
import ChannelSettingsModal from "@/components/ChannelSettingsModal";
import CreatePollModal from "@/components/CreatePollModal";

interface MessageViewProps {
  type: "channel" | "dm";
  id: string;
  channel: ChannelInfo | null;
  dm: DMInfo | null;
  currentUser: CurrentUser;
  allUsers: UserInfo[];
  onChannelUpdated?: (updated: Partial<ChannelInfo> & { id: string }) => void;
  // SSE-sourced events from ChatLayout
  sseNewMessages: MessageData[];
  sseEditedMessages: MessageData[];
  sseDeletedMessageIds: string[];
  sseReactions: Array<{ messageId: string; emoji: string; action: string; userId: string; userName?: string }>;
  sseThreadReplies: Array<{ threadParentId: string; message: MessageData }>;
  sseDmReadReceipts: Array<{ dmId: string; userId: string; lastReadAt: string }>;
  typingUsers: TypingUser[];
}

function formatTypingText(users: TypingUser[]): string {
  if (users.length === 1) return `${users[0].userName} is typing...`;
  if (users.length === 2) return `${users[0].userName} and ${users[1].userName} are typing...`;
  return `${users.length} people are typing...`;
}

export default function MessageView({
  type,
  id,
  channel,
  dm,
  currentUser,
  allUsers,
  onChannelUpdated,
  sseNewMessages,
  sseEditedMessages,
  sseDeletedMessageIds,
  sseReactions,
  sseThreadReplies,
  sseDmReadReceipts,
  typingUsers,
}: MessageViewProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPinned, setShowPinned] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [threadMessageId, setThreadMessageId] = useState<string | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const lastTypingSent = useRef(0);
  const [otherUserLastRead, setOtherUserLastRead] = useState<string | null>(null);

  // Fetch initial messages
  useEffect(() => {
    isFirstLoad.current = true;
    setLoading(true);
    setMessages([]);

    const endpoint =
      type === "channel"
        ? `/api/channels/${id}/messages`
        : `/api/dm/${id}/messages`;

    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) {
          setMessages(data.messages);
        }
      })
      .catch(() => toast.error("Failed to load messages"))
      .finally(() => setLoading(false));

    // Mark as read
    const readEndpoint =
      type === "channel"
        ? `/api/channels/${id}/read`
        : `/api/dm/${id}/read`;
    fetch(readEndpoint, { method: "POST" }).catch(() => {});

    // Fetch initial DM read status
    setOtherUserLastRead(null);
    if (type === "dm") {
      fetch(`/api/dm/${id}/read-status`)
        .then((r) => r.json())
        .then((data) => {
          if (data.lastReadAt) setOtherUserLastRead(data.lastReadAt);
        })
        .catch(() => {});
    }
  }, [type, id]);

  // Auto-scroll to bottom on initial load or new messages
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      if (isFirstLoad.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        isFirstLoad.current = false;
      } else {
        // Only auto-scroll if user is near bottom
        const el = scrollRef.current;
        const isNearBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        if (isNearBottom) {
          el.scrollTop = el.scrollHeight;
        }
      }
    }
  }, [messages]);

  // Process SSE new messages
  useEffect(() => {
    if (sseNewMessages.length === 0) return;
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const newMsgs = sseNewMessages.filter((m) => !existingIds.has(m.id));
      if (newMsgs.length === 0) return prev;
      return [...prev, ...newMsgs];
    });
    // Mark as read — include latest message id for DM read receipts
    const lastMsg = sseNewMessages[sseNewMessages.length - 1];
    const readEndpoint =
      type === "channel"
        ? `/api/channels/${id}/read`
        : `/api/dm/${id}/read`;
    fetch(readEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastMessageId: lastMsg?.id }),
    }).catch(() => {});
  }, [sseNewMessages, type, id]);

  // Process SSE edited messages
  useEffect(() => {
    if (sseEditedMessages.length === 0) return;
    setMessages((prev) =>
      prev.map((m) => {
        const edit = sseEditedMessages.find((e) => e.id === m.id);
        return edit ? edit : m;
      })
    );
  }, [sseEditedMessages]);

  // Process SSE reactions
  useEffect(() => {
    if (sseReactions.length === 0) return;
    setMessages((prev) =>
      prev.map((m) => {
        const reactionUpdates = sseReactions.filter((r) => r.messageId === m.id);
        if (reactionUpdates.length === 0) return m;

        let reactions = [...(m.reactions || [])];
        for (const update of reactionUpdates) {
          if (update.action === "removed") {
            reactions = reactions
              .map((r) =>
                r.emoji === update.emoji
                  ? { ...r, count: r.count - 1, users: r.users.filter((u) => u !== (update.userName || "")) }
                  : r
              )
              .filter((r) => r.count > 0);
          } else {
            const existing = reactions.find((r) => r.emoji === update.emoji);
            if (existing) {
              reactions = reactions.map((r) =>
                r.emoji === update.emoji
                  ? { ...r, count: r.count + 1, users: [...r.users, update.userName || ""] }
                  : r
              );
            } else {
              reactions = [...reactions, { emoji: update.emoji, count: 1, reacted: false, users: [update.userName || ""] }];
            }
          }
        }
        return { ...m, reactions };
      })
    );
  }, [sseReactions]);

  // Update otherUserLastRead from SSE dm_read events
  useEffect(() => {
    if (type !== "dm" || sseDmReadReceipts.length === 0) return;
    const relevant = sseDmReadReceipts.find(
      (r) => r.dmId === id && r.userId !== currentUser.id
    );
    if (relevant) {
      setOtherUserLastRead(relevant.lastReadAt);
    }
  }, [sseDmReadReceipts, type, id, currentUser.id]);

  // Typing emission handler
  const handleTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000) return;
    lastTypingSent.current = now;
    fetch("/api/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(type === "channel" ? { channelId: id } : { dmId: id }),
    }).catch(() => {});
  }, [type, id]);

  // Send message
  const handleSend = useCallback(
    async (content: string, files: File[]) => {
      const endpoint =
        type === "channel"
          ? `/api/channels/${id}/messages`
          : `/api/dm/${id}/messages`;

      try {
        if (files.length > 0) {
          const formData = new FormData();
          formData.append("content", content);
          files.forEach((f) => formData.append("files", f));
          const res = await fetch(endpoint, { method: "POST", body: formData });
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (data.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
          }
        } else {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (data.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
          }
        }
      } catch {
        toast.error("Failed to send message");
      }
    },
    [type, id]
  );

  // React to message
  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, emoji, type }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `${res.status}`);
        }
        const data = await res.json();

        // Optimistic local update
        const userName = currentUser.name;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            const reactions = [...(m.reactions || [])];
            if (data.action === "removed") {
              return {
                ...m,
                reactions: reactions
                  .map((r) =>
                    r.emoji === emoji
                      ? { ...r, count: r.count - 1, reacted: false, users: r.users.filter((u: string) => u !== userName) }
                      : r
                  )
                  .filter((r) => r.count > 0),
              };
            } else {
              const existing = reactions.find((r) => r.emoji === emoji);
              if (existing) {
                return {
                  ...m,
                  reactions: reactions.map((r) =>
                    r.emoji === emoji
                      ? { ...r, count: r.count + 1, reacted: true, users: [...r.users, userName] }
                      : r
                  ),
                };
              } else {
                return {
                  ...m,
                  reactions: [...reactions, { emoji, count: 1, reacted: true, users: [userName] }],
                };
              }
            }
          })
        );
      } catch (err) {
        toast.error(`Failed to add reaction: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    },
    [type, currentUser.name]
  );

  // Edit message
  const handleEdit = useCallback(
    async (messageId: string, newContent: string) => {
      try {
        const endpoint =
          type === "channel"
            ? `/api/channels/${id}/messages/${messageId}`
            : `/api/dm/${id}/messages/${messageId}`;
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newContent }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? data.message : m))
        );
      } catch {
        toast.error("Failed to edit message");
      }
    },
    [type, id]
  );

  // Delete message
  const handleDelete = useCallback(
    async (messageId: string) => {
      try {
        const endpoint =
          type === "channel"
            ? `/api/channels/${id}/messages/${messageId}`
            : `/api/dm/${id}/messages/${messageId}`;
        const res = await fetch(endpoint, { method: "DELETE" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? data.message : m))
        );
      } catch {
        toast.error("Failed to delete message");
      }
    },
    [type, id]
  );

  // Pin message
  const handlePin = useCallback(
    async (messageId: string) => {
      if (type !== "channel") {
        toast.error("Pinning is only available in channels");
        return;
      }
      try {
        const res = await fetch(`/api/channels/${id}/pin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId }),
        });
        if (res.status === 409) {
          const del = await fetch(`/api/channels/${id}/pin`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId }),
          });
          if (!del.ok) throw new Error();
          toast.success("Message unpinned");
          return;
        }
        if (!res.ok) throw new Error();
        toast.success("Message pinned");
      } catch {
        toast.error("Failed to pin message");
      }
    },
    [type, id]
  );

  // Vote on poll
  const handleVote = useCallback(
    async (pollId: string, optionId: string) => {
      if (type !== "channel") return;
      try {
        const res = await fetch(`/api/channels/${id}/polls/${pollId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optionId }),
        });
        if (!res.ok) throw new Error();
        setMessages((prev) =>
          prev.map((m) => {
            if (!m.poll || m.poll.id !== pollId) return m;
            const updatedOptions = m.poll.options.map((o) => ({
              ...o,
              votes: o.id === optionId ? o.votes + 1 : o.votes,
            }));
            return {
              ...m,
              poll: {
                ...m.poll,
                totalVotes: m.poll.totalVotes + 1,
                userVotedOptionId: optionId,
                options: updatedOptions,
              },
            };
          })
        );
      } catch {
        toast.error("Failed to vote");
      }
    },
    [type, id]
  );

  // Close poll
  const handleClosePoll = useCallback(
    async (pollId: string) => {
      if (type !== "channel") return;
      try {
        const res = await fetch(`/api/channels/${id}/polls/${pollId}/close`, {
          method: "POST",
        });
        if (!res.ok) throw new Error();
        setMessages((prev) =>
          prev.map((m) => {
            if (!m.poll || m.poll.id !== pollId) return m;
            return { ...m, poll: { ...m.poll, isClosed: true } };
          })
        );
        toast.success("Poll closed");
      } catch {
        toast.error("Failed to close poll");
      }
    },
    [type, id]
  );

  // Create poll
  const handleCreatePoll = useCallback(
    async (question: string, options: string[]) => {
      if (type !== "channel") return;
      try {
        const res = await fetch(`/api/channels/${id}/polls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, options }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
      } catch {
        toast.error("Failed to create poll");
      }
    },
    [type, id]
  );

  const scrollToMessage = useCallback((messageId: string) => {
    const el = scrollRef.current?.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-yellow-100/60", "dark:bg-yellow-900/30");
      setTimeout(() => {
        el.classList.remove("bg-yellow-100/60", "dark:bg-yellow-900/30");
      }, 1500);
    }
  }, []);

  const title = channel ? channel.name : dm ? dm.otherUser.name : "";
  const subtitle = channel?.description || (dm ? dm.otherUser.email : "");

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="hidden lg:flex items-center justify-between px-6 py-3 min-h-[57px] bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</h2>
              {channel && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {channel.memberCount} {channel.memberCount === 1 ? "member" : "members"}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
            )}
          </div>
          {type === "channel" && (
            <button
              onClick={() => setShowSettings(true)}
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                showSettings
                  ? "bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
              }`}
              title="Channel settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {type === "channel" && (
            <button
              onClick={() => setShowPinned(!showPinned)}
              className={`p-2 rounded-lg transition-colors ${
                showPinned
                  ? "bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}
              title="Pinned messages"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex min-h-0">
        {/* Message list */}
        <div className="flex-1 flex flex-col min-h-0">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto chat-scroll"
          >
            {loading ? (
              <div className="flex-1" />
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400 dark:text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {type === "channel"
                      ? `Welcome to ${channel?.name || "this channel"}`
                      : `Start a conversation with ${dm?.otherUser.name || "this person"}`}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Send the first message to get things started.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-2">
                {messages.map((msg, idx) => {
                  // Determine if "Seen" should appear after this message
                  let showSeen = false;
                  if (type === "dm" && otherUserLastRead && msg.userId === currentUser.id) {
                    const msgTime = new Date(msg.createdAt).getTime();
                    const readTime = new Date(otherUserLastRead).getTime();
                    if (msgTime <= readTime) {
                      // Only show on the LAST own message that qualifies
                      const laterOwnMsgRead = messages.slice(idx + 1).some(
                        (m) => m.userId === currentUser.id && new Date(m.createdAt).getTime() <= readTime
                      );
                      if (!laterOwnMsgRead) showSeen = true;
                    }
                  }
                  return (
                    <div key={msg.id}>
                      <MessageBubble
                        message={msg}
                        currentUserId={currentUser.id}
                        currentUserRole={currentUser.role}
                        onReact={handleReact}
                        onPin={handlePin}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onOpenThread={(id) => { setThreadMessageId(id); setShowPinned(false); }}
                        onVote={handleVote}
                        onClosePoll={handleClosePoll}
                      />
                      {showSeen && (
                        <div className="flex justify-end px-6 -mt-1 mb-1">
                          <span className="text-xs text-gray-400 dark:text-gray-500">Seen</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="px-6 py-1.5 flex items-center gap-1.5">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTypingText(typingUsers)}
              </span>
            </div>
          )}

          {/* Input */}
          <MessageInput
            onSend={handleSend}
            onTyping={handleTyping}
            placeholder={
              type === "channel"
                ? `Message ${channel?.name || "channel"}`
                : `Message ${dm?.otherUser.name || ""}`
            }
            allUsers={allUsers}
            onOpenPollModal={type === "channel" ? () => setShowPollModal(true) : undefined}
          />
        </div>

        {/* Pinned messages panel */}
        {showPinned && type === "channel" && (
          <PinnedMessagesPanel
            channelId={id}
            onClose={() => setShowPinned(false)}
            onNavigate={scrollToMessage}
          />
        )}

        {/* Thread panel */}
        {threadMessageId && (
          <ThreadPanel
            type={type}
            parentId={threadMessageId}
            resourceId={id}
            currentUserId={currentUser.id}
            currentUserRole={currentUser.role}
            allUsers={allUsers}
            onClose={() => setThreadMessageId(null)}
            onReact={handleReact}
            sseReplies={sseThreadReplies
              .filter((r) => r.threadParentId === threadMessageId)
              .map((r) => r.message)}
          />
        )}
      </div>

      {/* Channel settings modal */}
      {showSettings && channel && (
        <ChannelSettingsModal
          channel={channel}
          allUsers={allUsers}
          currentUserId={currentUser.id}
          onClose={() => setShowSettings(false)}
          onUpdated={(updated) => {
            onChannelUpdated?.(updated);
            setShowSettings(false);
          }}
        />
      )}

      {/* Create poll modal */}
      {showPollModal && (
        <CreatePollModal
          onClose={() => setShowPollModal(false)}
          onCreatePoll={handleCreatePoll}
        />
      )}
    </div>
  );
}
