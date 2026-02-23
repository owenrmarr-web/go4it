"use client";

import { useState, useRef, useMemo } from "react";
import EmojiPicker, { loadFavorites } from "@/components/EmojiPicker";
import { renderMessageContent } from "@/lib/renderMessageContent";

export interface MessageFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted: boolean;
  users: string[];
}

export interface PollData {
  id: string;
  question: string;
  isClosed: boolean;
  creatorId: string;
  totalVotes: number;
  userVotedOptionId: string | null;
  options: { id: string; text: string; votes: number }[];
}

export interface MessageData {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  userAvatarColor?: string | null;
  userImage?: string | null;
  userProfileColor?: string | null;
  userProfileEmoji?: string | null;
  userTitle?: string | null;
  isAI: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  parentId?: string | null;
  createdAt: string;
  files: MessageFile[];
  reactions: MessageReaction[];
  threadCount?: number;
  lastReplyAt?: string | null;
  lastReplyUserName?: string | null;
  poll?: PollData;
}

interface MessageBubbleProps {
  message: MessageData;
  currentUserId: string;
  currentUserRole?: string;
  onReact: (messageId: string, emoji: string) => void;
  onPin: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onOpenThread?: (messageId: string) => void;
  onVote?: (pollId: string, optionId: string) => void;
  onClosePoll?: (pollId: string) => void;
  compact?: boolean; // for thread panel display
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(userId: string): string {
  const colors = [
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageBubble({
  message,
  currentUserId,
  currentUserRole,
  onReact,
  onPin,
  onEdit,
  onDelete,
  onOpenThread,
  onVote,
  onClosePoll,
  compact,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const plusBtnRef = useRef<HTMLButtonElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const quickReactions = useMemo(() => loadFavorites().slice(0, 5), []);
  const isOwn = message.userId === currentUserId;
  const canDelete = isOwn || currentUserRole === "admin";
  const initials = getInitials(message.userName || "?");
  // Avatar priority: platform image > local upload > emoji on color > initials on color
  const avatarUrl = message.userImage || message.userAvatarUrl;
  const avatarEmoji = !avatarUrl ? message.userProfileEmoji : null;
  const avatarBgColor = message.userProfileColor || null;
  const avatarTwClass = message.userAvatarColor || getAvatarColor(message.userId);
  const isHexColor = !!avatarBgColor?.startsWith("#");

  const handleMouseEnter = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    if (!showActions && !showTimeout.current) {
      showTimeout.current = setTimeout(() => {
        setShowActions(true);
        showTimeout.current = null;
      }, 200);
    }
  };

  const handleMouseLeave = () => {
    if (showTimeout.current) {
      clearTimeout(showTimeout.current);
      showTimeout.current = null;
    }
    // Don't auto-hide while the full picker is open
    if (showReactPicker) return;
    hideTimeout.current = setTimeout(() => {
      setShowActions(false);
      setShowReactPicker(false);
    }, 300);
  };

  const handleOpenPicker = () => {
    if (showReactPicker) {
      setShowReactPicker(false);
      return;
    }
    if (plusBtnRef.current) {
      const rect = plusBtnRef.current.getBoundingClientRect();
      const pickerH = 300;
      const pickerW = 288; // w-72
      const spaceAbove = rect.top;
      const top = spaceAbove >= pickerH + 8
        ? rect.top - pickerH - 8
        : rect.bottom + 8;
      const left = Math.max(8, Math.min(rect.right - pickerW, window.innerWidth - pickerW - 8));
      setPickerStyle({ top, left });
    }
    setShowReactPicker(true);
  };

  // Handle deleted messages
  if (message.isDeleted) {
    return (
      <div
        data-message-id={message.id}
        className="group relative flex gap-3 px-4 py-4"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={message.userName} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 mt-0.5 bg-gray-100 dark:bg-gray-700 opacity-50" />
        ) : avatarEmoji ? (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 opacity-50 text-lg" style={isHexColor ? { backgroundColor: avatarBgColor! } : undefined}>
            {avatarEmoji}
          </div>
        ) : (
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 mt-0.5 opacity-50 ${!isHexColor ? avatarTwClass : ""}`}
            style={isHexColor ? { backgroundColor: avatarBgColor! } : undefined}
          >{initials}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-semibold text-sm text-gray-400 dark:text-gray-500">{message.userName}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{formatRelativeTime(message.createdAt)}</span>
          </div>
          <p className="text-sm italic text-gray-400 dark:text-gray-500">This message was deleted</p>
        </div>
      </div>
    );
  }

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === message.content) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }
    onEdit?.(message.id, trimmed);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  return (
    <div
      data-message-id={message.id}
      className={`group relative flex gap-3 px-4 py-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors ${
        isOwn ? "flex-row-reverse" : ""
      } ${message.isAI ? "bg-purple-50/50 dark:bg-purple-900/20" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Avatar */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={message.userName}
          className={`${compact ? "w-7 h-7" : "w-9 h-9"} rounded-lg object-cover flex-shrink-0 mt-0.5 bg-gray-100 dark:bg-gray-700`}
        />
      ) : avatarEmoji ? (
        <div
          className={`${compact ? "w-7 h-7 text-sm" : "w-9 h-9 text-lg"} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}
          style={isHexColor ? { backgroundColor: avatarBgColor! } : undefined}
        >
          {avatarEmoji}
        </div>
      ) : (
        <div
          className={`${compact ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs"} rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0 mt-0.5 ${!isHexColor ? avatarTwClass : ""}`}
          style={isHexColor ? { backgroundColor: avatarBgColor! } : undefined}
        >
          {initials}
        </div>
      )}

      {/* Content */}
      <div ref={contentRef} className="relative flex-1 min-w-0">
        {/* Full emoji picker — fixed position, smart placement */}
        {showReactPicker && (
          <EmojiPicker
            onSelect={(emoji) => {
              onReact(message.id, emoji);
              setShowReactPicker(false);
              setShowActions(false);
            }}
            onClose={() => {
              setShowReactPicker(false);
              setShowActions(false);
            }}
            style={pickerStyle}
          />
        )}

        {/* Header */}
        <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? "justify-end" : ""}`}>
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {message.userName}
          </span>
          {message.userTitle && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{message.userTitle}</span>
          )}
          {message.isAI && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
              AI
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatRelativeTime(message.createdAt)}
          </span>
          {message.isEdited && (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">(edited)</span>
          )}
        </div>

        {/* Message text or edit mode */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              ref={editTextareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="w-full px-3 py-2 text-sm rounded-lg border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={2}
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => { setIsEditing(false); setEditContent(message.content); }}
                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-2 py-1 text-xs text-white gradient-brand rounded hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className={`text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words ${isOwn ? "text-right" : ""}`}>
            {renderMessageContent(message.content)}
          </div>
        )}

        {/* Poll widget */}
        {message.poll && (
          <div className="mt-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 max-w-md">
            <p className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2">{message.poll.question}</p>
            <div className="space-y-1.5">
              {message.poll.options.map((opt) => {
                const pct = message.poll!.totalVotes > 0 ? Math.round((opt.votes / message.poll!.totalVotes) * 100) : 0;
                const hasVoted = message.poll!.userVotedOptionId !== null;
                const isMyVote = message.poll!.userVotedOptionId === opt.id;
                const closed = message.poll!.isClosed;

                if (hasVoted || closed) {
                  // Show results
                  return (
                    <div key={opt.id} className="relative">
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className={`${isMyVote ? "font-semibold text-purple-700 dark:text-purple-300" : "text-gray-700 dark:text-gray-300"}`}>
                          {opt.text}{isMyVote && " (your vote)"}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">{pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isMyVote ? "bg-purple-500" : "bg-gray-400 dark:bg-gray-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                }

                // Show vote buttons
                return (
                  <button
                    key={opt.id}
                    onClick={() => onVote?.(message.poll!.id, opt.id)}
                    className="w-full text-left px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-500 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">{message.poll.totalVotes} vote{message.poll.totalVotes !== 1 ? "s" : ""}</span>
              {!message.poll.isClosed && message.poll.creatorId === currentUserId && (
                <button
                  onClick={() => onClosePoll?.(message.poll!.id)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Close poll
                </button>
              )}
              {message.poll.isClosed && (
                <span className="text-xs text-gray-400 italic">Poll closed</span>
              )}
            </div>
          </div>
        )}

        {/* File attachments */}
        {message.files.length > 0 && (
          <div className={`mt-2 flex flex-wrap gap-2 ${isOwn ? "justify-end" : ""}`}>
            {message.files.map((file) => {
              const isImage = file.mimeType.startsWith("image/");
              const fileUrl = `/api/files/${file.id}`;
              if (isImage) {
                return (
                  <a
                    key={file.id}
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={fileUrl}
                      alt={file.filename}
                      className="max-w-sm max-h-64 rounded-lg border border-gray-200 dark:border-gray-600 object-cover"
                    />
                  </a>
                );
              }
              return (
                <a
                  key={file.id}
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors max-w-xs"
                >
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{file.filename}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className={`mt-1.5 flex flex-wrap items-center gap-1 ${isOwn ? "justify-end" : ""}`}>
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => onReact(message.id, reaction.emoji)}
                className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors
                  ${
                    reaction.reacted
                      ? "bg-purple-50 dark:bg-purple-900/40 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300"
                      : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                  }
                `}
                title={reaction.users.join(", ")}
              >
                <span>{reaction.emoji}</span>
                <span className="font-medium">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hover action bar — absolutely positioned in the gap between messages */}
        {showActions && !isEditing && (
          <div
            className="absolute top-full mt-1 left-0 z-10 inline-flex items-center bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Quick reactions */}
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(message.id, emoji);
                  setShowActions(false);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors text-sm leading-none"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            {/* More reactions */}
            <button
              ref={plusBtnRef}
              onClick={handleOpenPicker}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="More reactions"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
              </svg>
            </button>
            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />
            {/* Reply (thread) */}
            {onOpenThread && !compact && (
              <button
                onClick={() => { onOpenThread(message.id); setShowActions(false); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                title="Reply in thread"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
            )}
            {/* Edit (own only) */}
            {isOwn && onEdit && (
              <button
                onClick={() => {
                  setEditContent(message.content);
                  setIsEditing(true);
                  setShowActions(false);
                  setTimeout(() => editTextareaRef.current?.focus(), 50);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                title="Edit message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {/* Delete (own or admin) */}
            {canDelete && onDelete && (
              <button
                onClick={() => { onDelete(message.id); setShowActions(false); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                title="Delete message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            {/* Pin */}
            <button
              onClick={() => onPin(message.id)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Pin message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>
        )}

        {/* Thread indicator */}
        {!compact && (message.threadCount ?? 0) > 0 && (
          <button
            onClick={() => onOpenThread?.(message.id)}
            className="mt-1.5 flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            {message.threadCount} {message.threadCount === 1 ? "reply" : "replies"}
            {message.lastReplyUserName && (
              <span className="text-gray-400 dark:text-gray-500">
                — last from {message.lastReplyUserName}
              </span>
            )}
          </button>
        )}
      </div>

    </div>
  );
}
