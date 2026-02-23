"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface PinnedMessage {
  id: string;
  messageId: string;
  content: string;
  authorName: string;
  pinnedAt: string;
  pinnedByName: string;
}

interface PinnedMessagesPanelProps {
  channelId: string;
  onClose: () => void;
  onNavigate?: (messageId: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PinnedMessagesPanel({
  channelId,
  onClose,
  onNavigate,
}: PinnedMessagesPanelProps) {
  const [pinned, setPinned] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/channels/${channelId}/pin`)
      .then((r) => r.json())
      .then((data) => {
        if (data.pinned) setPinned(data.pinned);
      })
      .catch(() => toast.error("Failed to load pinned messages"))
      .finally(() => setLoading(false));
  }, [channelId]);

  const handleUnpin = async (messageId: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/pin`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) throw new Error();
      setPinned((prev) => prev.filter((p) => p.messageId !== messageId));
      toast.success("Message unpinned");
    } catch {
      toast.error("Failed to unpin message");
    }
  };

  return (
    <div className="w-72 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          Pinned Messages
        </h3>
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
      <div className="flex-1 overflow-y-auto chat-scroll">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : pinned.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No pinned messages</p>
            <p className="text-xs text-gray-400 mt-1">
              Pin important messages to keep them handy
            </p>
          </div>
        ) : (
          <div className="py-2">
            {pinned.map((pin) => (
              <div
                key={pin.id}
                className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                onClick={() => onNavigate?.(pin.messageId)}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {pin.authorName}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUnpin(pin.messageId); }}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                    title="Unpin"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words line-clamp-4">
                  {pin.content}
                </p>
                <p className="text-xs text-gray-400 mt-1.5">
                  Pinned by {pin.pinnedByName} on {formatDate(pin.pinnedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
