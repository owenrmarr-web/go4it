"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import UserAvatar from "@/components/UserAvatar";

interface CommentUser {
  id: string;
  name: string | null;
  email: string;
}

interface Comment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  user: CommentUser;
  createdAt: string;
}

interface CommentSectionProps {
  projectId: string;
  taskId: string;
  initialComments: Comment[];
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Renders text with @mentions highlighted.
 * Splits text by @word patterns and wraps matches in styled spans.
 */
function renderWithMentions(text: string): React.ReactNode[] {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.match(/^@\w+$/)) {
      return (
        <span key={i} className="text-purple-600 font-medium">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function CommentSection({
  projectId,
  taskId,
  initialComments,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const basePath = `/api/projects/${projectId}/tasks/${taskId}/comments`;

  // Poll for new comments every 3 seconds
  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(basePath);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      // Silently fail polling
    }
  }, [basePath]);

  useEffect(() => {
    const interval = setInterval(fetchComments, 3000);
    return () => clearInterval(interval);
  }, [fetchComments]);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const submitComment = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setContent("");
        toast.success("Comment added");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to add comment");
      }
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Comments list */}
      <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No comments yet. Be the first to comment.
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <UserAvatar
                name={comment.user.name || comment.user.email}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {comment.user.name || comment.user.email}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTimestamp(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 whitespace-pre-wrap">
                  {renderWithMentions(comment.content)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* New comment form */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              submitComment();
            }
          }}
          placeholder="Write a comment... Use @name to mention"
          rows={2}
          className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none resize-none placeholder-gray-400"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-400">
            {navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to submit
          </span>
          <button
            onClick={submitComment}
            disabled={!content.trim() || submitting}
            className="px-4 py-1.5 text-sm gradient-brand text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}
