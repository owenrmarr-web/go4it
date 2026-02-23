"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import MessageBubble, { type MessageData } from "@/components/MessageBubble";
import MessageInput from "@/components/MessageInput";
import type { UserInfo } from "@/components/ChatLayout";

interface ThreadPanelProps {
  type: "channel" | "dm";
  parentId: string;
  resourceId: string; // channel or DM id
  currentUserId: string;
  currentUserRole: string;
  allUsers: UserInfo[];
  onClose: () => void;
  onReact: (messageId: string, emoji: string) => void;
  sseReplies: MessageData[];
}

export default function ThreadPanel({
  type,
  parentId,
  resourceId,
  currentUserId,
  currentUserRole,
  allUsers,
  onClose,
  onReact,
  sseReplies,
}: ThreadPanelProps) {
  const [parentMessage, setParentMessage] = useState<MessageData | null>(null);
  const [replies, setReplies] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch thread data
  useEffect(() => {
    setLoading(true);
    const endpoint =
      type === "channel"
        ? `/api/channels/${resourceId}/messages/${parentId}/thread`
        : `/api/dm/${resourceId}/messages/${parentId}/thread`;

    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => {
        if (data.parent) setParentMessage(data.parent);
        if (data.replies) setReplies(data.replies);
      })
      .catch(() => toast.error("Failed to load thread"))
      .finally(() => setLoading(false));
  }, [type, resourceId, parentId]);

  // Auto-scroll on new replies
  useEffect(() => {
    if (scrollRef.current && replies.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies]);

  // Process SSE replies
  useEffect(() => {
    if (sseReplies.length === 0) return;
    setReplies((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const newMsgs = sseReplies.filter((m) => !existingIds.has(m.id));
      if (newMsgs.length === 0) return prev;
      return [...prev, ...newMsgs];
    });
  }, [sseReplies]);

  // Send reply
  const handleSendReply = useCallback(
    async (content: string, files: File[]) => {
      const endpoint =
        type === "channel"
          ? `/api/channels/${resourceId}/messages`
          : `/api/dm/${resourceId}/messages`;

      try {
        if (files.length > 0) {
          const formData = new FormData();
          formData.append("content", content);
          formData.append("parentId", parentId);
          files.forEach((f) => formData.append("files", f));
          const res = await fetch(endpoint, { method: "POST", body: formData });
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (data.message) {
            setReplies((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
          }
        } else {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, parentId }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (data.message) {
            setReplies((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
          }
        }
      } catch {
        toast.error("Failed to send reply");
      }
    },
    [type, resourceId, parentId]
  );

  // Edit reply
  const handleEdit = useCallback(
    async (messageId: string, newContent: string) => {
      try {
        const endpoint =
          type === "channel"
            ? `/api/channels/${resourceId}/messages/${messageId}`
            : `/api/dm/${resourceId}/messages/${messageId}`;
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newContent }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setReplies((prev) =>
          prev.map((m) => (m.id === messageId ? data.message : m))
        );
      } catch {
        toast.error("Failed to edit reply");
      }
    },
    [type, resourceId]
  );

  // Delete reply
  const handleDelete = useCallback(
    async (messageId: string) => {
      try {
        const endpoint =
          type === "channel"
            ? `/api/channels/${resourceId}/messages/${messageId}`
            : `/api/dm/${resourceId}/messages/${messageId}`;
        const res = await fetch(endpoint, { method: "DELETE" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setReplies((prev) =>
          prev.map((m) => (m.id === messageId ? data.message : m))
        );
      } catch {
        toast.error("Failed to delete reply");
      }
    },
    [type, resourceId]
  );

  const handlePin = useCallback(() => {}, []);

  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Thread</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <>
            {/* Parent message */}
            {parentMessage && (
              <div className="border-b border-gray-100 dark:border-gray-700">
                <MessageBubble
                  message={parentMessage}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  onReact={onReact}
                  onPin={handlePin}
                  compact
                />
              </div>
            )}

            {/* Replies */}
            <div className="py-1">
              {replies.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-4">No replies yet</p>
              ) : (
                replies.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onReact={onReact}
                    onPin={handlePin}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    compact
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Reply input */}
      <MessageInput
        onSend={handleSendReply}
        placeholder="Reply..."
        allUsers={allUsers}
      />
    </div>
  );
}
