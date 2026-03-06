"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ============================================
// Types
// ============================================

interface ToolCallInfo {
  app: string;
  query?: string;
  summary?: string;
  loading: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: string | null;
  toolCallDisplays?: ToolCallInfo[];
  createdAt?: string;
}

interface Conversation {
  id: string;
  title: string | null;
  updatedAt: string;
}

interface DarkTokens {
  bg: string; border: string; text: string; textSecondary: string; textMuted: string;
  hover: string; inputBg: string; inputBorder: string; activeItem: string; hoverItem: string;
  editBg: string; editBorder: string; actionHover: string; promptBg: string; promptHover: string;
  promptText: string; promptBorder: string; toolBg: string; toolText: string;
  assistantBg: string; assistantText: string; dots: string; dotsText: string;
}

interface ChatPanelProps {
  open?: boolean;
  onClose?: () => void;
  slug: string;
  orgName: string;
  accentColor: string;
  initialQuery?: string;
  onUsageUpdate?: (used: number, limit: number) => void;
  inline?: boolean;
  suggestedPrompts?: string[];
  dark?: boolean;
}

// ============================================
// Main ChatPanel
// ============================================

export default function ChatPanel({
  open = true,
  onClose,
  slug,
  orgName,
  accentColor,
  initialQuery,
  onUsageUpdate,
  inline = false,
  suggestedPrompts,
  dark = false,
}: ChatPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showList, setShowList] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const [aiUsed, setAiUsed] = useState(0);
  const [aiLimit, setAiLimit] = useState(10);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialQueryHandled = useRef(false);

  const isVisible = inline || open;

  // Load conversation list
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${slug}/chat/conversations`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch {
      // ignore
    }
  }, [slug]);

  useEffect(() => {
    if (isVisible) {
      loadConversations();
    }
  }, [isVisible, loadConversations]);

  // Handle initial query from search bar
  useEffect(() => {
    if (isVisible && initialQuery && !initialQueryHandled.current) {
      initialQueryHandled.current = true;
      setActiveConversationId(null);
      setMessages([]);
      setShowList(false);
      sendMessage(initialQuery);
    }
    if (!isVisible) {
      initialQueryHandled.current = false;
    }
  }, [isVisible, initialQuery]);

  // Auto-scroll to bottom (only when there are messages)
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isVisible && !streaming) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isVisible, streaming, activeConversationId]);

  // Load conversation messages
  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/portal/${slug}/chat/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setActiveConversationId(convId);
        setShowList(false);
      }
    } catch {
      // ignore
    }
  };

  // Delete conversation
  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/portal/${slug}/chat/${convId}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch {
      // ignore
    }
  };

  // Save edited title
  const saveTitle = async (convId: string, newTitle: string) => {
    setEditingTitleId(null);
    const trimmed = newTitle.trim();
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, title: trimmed || c.title } : c))
    );
    try {
      await fetch(`/api/portal/${slug}/chat/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
    } catch { /* ignore */ }
  };

  // Send message and stream response
  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    // Create placeholder for assistant response
    const assistantId = `temp-assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch(`/api/portal/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          conversationId: activeConversationId,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to connect to AI");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            handleStreamEvent(event, assistantId);
          } catch {
            // skip malformed events
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith("data: ")) {
        try {
          const event = JSON.parse(buffer.slice(6));
          handleStreamEvent(event, assistantId);
        } catch {
          // skip
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: m.content || "Sorry, something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setStreaming(false);
      // Clear any remaining loading indicators on tool calls
      setMessages((prev) =>
        prev.map((m) =>
          m.toolCallDisplays?.some((tc) => tc.loading)
            ? { ...m, toolCallDisplays: m.toolCallDisplays.map((tc) => ({ ...tc, loading: false })) }
            : m
        )
      );
      loadConversations();
    }
  };

  const handleStreamEvent = (
    event: { type: string; [key: string]: unknown },
    assistantId: string
  ) => {
    switch (event.type) {
      case "conversation":
        setActiveConversationId(event.id as string);
        break;

      case "usage":
        setAiUsed(event.used as number);
        setAiLimit(event.limit as number);
        onUsageUpdate?.(event.used as number, event.limit as number);
        break;

      case "title": {
        const titleConvId = event.conversationId as string;
        const newTitle = event.title as string;
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === titleConvId);
          if (exists) {
            return prev.map((c) => c.id === titleConvId ? { ...c, title: newTitle } : c);
          }
          // New conversation not yet in list — add it
          return [{ id: titleConvId, title: newTitle, updatedAt: new Date().toISOString() }, ...prev];
        });
        break;
      }

      case "text":
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;
            const filtered = m.toolCallDisplays?.filter((tc) => tc.app !== "AI");
            return { ...m, content: m.content + (event.content as string), toolCallDisplays: filtered };
          })
        );
        break;

      case "tool_start":
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  toolCallDisplays: [
                    ...(m.toolCallDisplays || []),
                    { app: event.app as string, query: event.query as string, loading: true },
                  ],
                }
              : m
          )
        );
        break;

      case "tool_result":
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  toolCallDisplays: m.toolCallDisplays?.map((tc) =>
                    tc.app === event.app && tc.loading
                      ? { ...tc, summary: event.summary as string, loading: false }
                      : tc
                  ),
                }
              : m
          )
        );
        break;

      case "status":
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  toolCallDisplays: [
                    ...(m.toolCallDisplays || []),
                    { app: "AI", summary: event.content as string, loading: true },
                  ],
                }
              : m
          )
        );
        break;

      case "error":
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || (event.message as string) }
              : m
          )
        );
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setShowList(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  if (!isVisible) return null;

  // Dark mode color tokens
  const d = {
    bg: dark ? "bg-[#1a1d27]" : "bg-white",
    border: dark ? "border-[#2a2d3a]" : "border-gray-100",
    text: dark ? "text-gray-100" : "text-gray-900",
    textSecondary: dark ? "text-gray-400" : "text-gray-500",
    textMuted: dark ? "text-gray-500" : "text-gray-400",
    hover: dark ? "hover:bg-[#252836]" : "hover:bg-gray-100",
    inputBg: dark ? "bg-[#252836]" : "bg-gray-50",
    inputBorder: dark ? "border-[#3a3d4a]" : "border-gray-200",
    activeItem: dark ? "bg-[#252836]" : "bg-gray-100",
    hoverItem: dark ? "hover:bg-[#1f2230]" : "hover:bg-gray-50",
    editBg: dark ? "bg-[#252836]" : "bg-white",
    editBorder: dark ? "border-[#3a3d4a]" : "border-gray-300",
    actionHover: dark ? "hover:bg-[#3a3d4a]" : "hover:bg-gray-200",
    promptBg: dark ? "bg-[#252836]" : "bg-gray-50",
    promptHover: dark ? "hover:bg-[#2a2d3a]" : "hover:bg-gray-100",
    promptText: dark ? "text-gray-300" : "text-gray-600",
    promptBorder: dark ? "border-[#3a3d4a]" : "border-gray-100",
    toolBg: dark ? "bg-[#252836]" : "bg-gray-50",
    toolText: dark ? "text-gray-400" : "text-gray-500",
    assistantBg: dark ? "bg-[#252836]" : "bg-gray-50",
    assistantText: dark ? "text-gray-100" : "text-gray-900",
    dots: dark ? "bg-gray-500" : "bg-gray-300",
    dotsText: dark ? "text-gray-500" : "text-gray-400",
  };

  // ============================================
  // Inline mode — fills parent container
  // ============================================
  if (inline) {
    return (
      <div className={`flex flex-col h-full ${d.bg} rounded-2xl border ${d.border} shadow-sm overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${d.border}`}>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowList(!showList)}
              className={`p-1.5 rounded-lg ${d.hover} transition-colors ${d.textSecondary}`}
              title="Conversations"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              </svg>
              <h2 className={`text-sm font-semibold ${d.text}`}>GoPilot</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {aiUsed > 0 && (
              <span className={`text-[10px] ${d.textMuted} tabular-nums`}>
                {aiUsed}/{aiLimit}
              </span>
            )}
            <button
              onClick={startNewChat}
              className={`p-1.5 rounded-lg ${d.hover} transition-colors ${d.textSecondary}`}
              title="New chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Conversation List */}
        {showList ? (
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            accentColor={accentColor}
            editingTitleId={editingTitleId}
            editingTitleValue={editingTitleValue}
            onStartNewChat={startNewChat}
            onLoadConversation={loadConversation}
            onDeleteConversation={deleteConversation}
            onStartEditing={(id, title) => { setEditingTitleId(id); setEditingTitleValue(title); }}
            onEditingChange={setEditingTitleValue}
            onSaveTitle={saveTitle}
            onCancelEditing={() => setEditingTitleId(null)}
            dark={dark}
            d={d}
          />
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && !streaming && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30 mb-3">
                    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                    <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
                  </svg>
                  <h3 className={`text-sm font-semibold ${d.text} mb-1`}>
                    Ask anything about your business
                  </h3>
                  <p className={`text-xs ${d.textMuted} max-w-[280px] mb-5`}>
                    Search across all your apps — contacts, invoices, tasks, tickets, and more.
                  </p>
                  {suggestedPrompts && suggestedPrompts.length > 0 && (
                    <div className="w-full space-y-2 max-w-[320px]">
                      {suggestedPrompts.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(prompt)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl ${d.promptBg} ${d.promptHover} text-sm ${d.promptText} transition-colors border ${d.promptBorder}`}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  accentColor={accentColor}
                  d={d}
                />
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`px-4 py-3 border-t ${d.border}`}>
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question..."
                  disabled={streaming}
                  rows={1}
                  className={`w-full resize-none px-4 py-3 pr-12 ${d.inputBg} rounded-xl border ${d.inputBorder} text-sm ${d.text} placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 transition-all`}
                  style={{
                    // @ts-expect-error -- CSS custom property
                    "--tw-ring-color": `${accentColor}40`,
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || streaming}
                  className="absolute right-2 bottom-2 p-2 rounded-lg text-white disabled:opacity-30 transition-all hover:opacity-90"
                  style={{ backgroundColor: accentColor }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ============================================
  // Overlay mode (original slide-out panel)
  // ============================================
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 sm:block"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 sm:inset-auto sm:right-0 sm:top-0 sm:bottom-0 sm:w-[440px] bg-white z-50 flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowList(!showList)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Conversations"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <h2 className="text-sm font-bold text-gray-900">GoPilot</h2>
              <p className="text-[11px] text-gray-400">{orgName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startNewChat}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="New chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Conversation List */}
        {showList ? (
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            accentColor={accentColor}
            editingTitleId={editingTitleId}
            editingTitleValue={editingTitleValue}
            onStartNewChat={startNewChat}
            onLoadConversation={loadConversation}
            onDeleteConversation={deleteConversation}
            onStartEditing={(id, title) => { setEditingTitleId(id); setEditingTitleValue(title); }}
            onEditingChange={setEditingTitleValue}
            onSaveTitle={saveTitle}
            onCancelEditing={() => setEditingTitleId(null)}
          />
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 && !streaming && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 mb-3">
                    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                    <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Ask anything about your business
                  </h3>
                  <p className="text-xs text-gray-400 max-w-[280px]">
                    I can search across all your apps — contacts, invoices, tasks, tickets, and more.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  accentColor={accentColor}
                  d={d}
                />
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t border-gray-100">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={streaming}
                  rows={1}
                  className="w-full resize-none px-4 py-3 pr-12 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 transition-all"
                  style={{
                    // @ts-expect-error -- CSS custom property
                    "--tw-ring-color": `${accentColor}40`,
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || streaming}
                  className="absolute right-2 bottom-2 p-2 rounded-lg text-white disabled:opacity-30 transition-all hover:opacity-90"
                  style={{ backgroundColor: accentColor }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ============================================
// Conversation List (shared by inline + overlay)
// ============================================

function ConversationList({
  conversations,
  activeConversationId,
  accentColor,
  editingTitleId,
  editingTitleValue,
  onStartNewChat,
  onLoadConversation,
  onDeleteConversation,
  onStartEditing,
  onEditingChange,
  onSaveTitle,
  onCancelEditing,
  d,
}: {
  conversations: Conversation[];
  activeConversationId: string | null;
  accentColor: string;
  editingTitleId: string | null;
  editingTitleValue: string;
  onStartNewChat: () => void;
  onLoadConversation: (id: string) => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onStartEditing: (id: string, title: string) => void;
  onEditingChange: (value: string) => void;
  onSaveTitle: (id: string, title: string) => void;
  onCancelEditing: () => void;
  dark?: boolean;
  d?: DarkTokens;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3">
        <button
          onClick={onStartNewChat}
          className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: accentColor }}
        >
          + New Conversation
        </button>
      </div>
      {conversations.length === 0 ? (
        <p className={`text-center text-sm ${d?.textMuted || "text-gray-400"} mt-8`}>
          No conversations yet
        </p>
      ) : (
        <div className="px-3 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onLoadConversation(conv.id)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors group ${
                activeConversationId === conv.id
                  ? (d?.activeItem || "bg-gray-100")
                  : (d?.hoverItem || "hover:bg-gray-50")
              }`}
            >
              <div className="min-w-0 flex-1">
                {editingTitleId === conv.id ? (
                  <input
                    autoFocus
                    value={editingTitleValue}
                    onChange={(e) => onEditingChange(e.target.value)}
                    onBlur={() => onSaveTitle(conv.id, editingTitleValue)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSaveTitle(conv.id, editingTitleValue);
                      if (e.key === "Escape") onCancelEditing();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full text-sm font-medium ${d?.text || "text-gray-900"} ${d?.editBg || "bg-white"} border ${d?.editBorder || "border-gray-300"} rounded px-1.5 py-0.5 focus:outline-none focus:ring-1`}
                    style={{ ["--tw-ring-color" as string]: accentColor }}
                  />
                ) : (
                  <p
                    className={`text-sm font-medium ${d?.text || "text-gray-900"} truncate cursor-text`}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onStartEditing(conv.id, conv.title || "");
                    }}
                  >
                    {conv.title || "Untitled"}
                  </p>
                )}
                <p className={`text-[11px] ${d?.textMuted || "text-gray-400"}`}>
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartEditing(conv.id, conv.title || "");
                  }}
                  className={`p-1 rounded ${d?.actionHover || "hover:bg-gray-200"}`}
                  title="Rename"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={d?.textMuted || "text-gray-400"}>
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => onDeleteConversation(conv.id, e)}
                  className={`p-1 rounded ${d?.actionHover || "hover:bg-gray-200"}`}
                  title="Delete"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={d?.textMuted || "text-gray-400"}>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Markdown renderer (lightweight inline parsing)
// ============================================

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    // Parse inline markdown: **bold**, *italic*, `code`
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      // Find the earliest match
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
      const codeMatch = remaining.match(/`([^`]+)`/);

      const candidates: { type: string; index: number; full: string; inner: string }[] = [];
      if (boldMatch?.index !== undefined) candidates.push({ type: "bold", index: boldMatch.index, full: boldMatch[0], inner: boldMatch[1] });
      if (italicMatch?.index !== undefined) candidates.push({ type: "italic", index: italicMatch.index, full: italicMatch[0], inner: italicMatch[1] });
      if (codeMatch?.index !== undefined) candidates.push({ type: "code", index: codeMatch.index, full: codeMatch[0], inner: codeMatch[1] });

      if (candidates.length === 0) {
        parts.push(remaining);
        break;
      }

      // Pick the earliest match (bold takes priority over italic at same position)
      candidates.sort((a, b) => a.index - b.index || (a.type === "bold" ? -1 : 1));
      const match = candidates[0];

      if (match.index > 0) {
        parts.push(remaining.slice(0, match.index));
      }

      if (match.type === "bold") {
        parts.push(<strong key={key++}>{match.inner}</strong>);
      } else if (match.type === "italic") {
        parts.push(<em key={key++}>{match.inner}</em>);
      } else if (match.type === "code") {
        parts.push(<code key={key++} className="px-1 py-0.5 rounded bg-black/10 text-[0.85em] font-mono">{match.inner}</code>);
      }

      remaining = remaining.slice(match.index + match.full.length);
    }

    // Add newline between lines (not after last)
    if (lineIdx < lines.length - 1) {
      parts.push(<br key={`br-${lineIdx}`} />);
    }

    return <span key={lineIdx}>{parts}</span>;
  });
}

// ============================================
// Message Bubble
// ============================================

function MessageBubble({
  message,
  accentColor,
  d,
}: {
  message: Message;
  accentColor: string;
  d?: DarkTokens;
}) {
  const isUser = message.role === "user";

  // Build tool call displays: use live toolCallDisplays if available,
  // otherwise parse saved toolCalls JSON from DB
  let toolCallDisplays: ToolCallInfo[] = message.toolCallDisplays || [];
  if (toolCallDisplays.length === 0 && message.toolCalls && !isUser) {
    try {
      const parsed = JSON.parse(message.toolCalls) as { app: string; query: string; result?: string; error?: string }[];
      toolCallDisplays = parsed.map((tc) => ({
        app: tc.app,
        query: tc.query,
        summary: tc.error ? `Error: ${tc.error}` : (
          (() => { try { return JSON.parse(tc.result || "{}").data?.summary || "Data retrieved"; } catch { return "Data retrieved"; } })()
        ),
        loading: false,
      }));
    } catch { /* ignore */ }
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "" : "space-y-2"}`}>
        {/* Tool call indicators — above text for assistant messages */}
        {!isUser && toolCallDisplays.length > 0 && (
          <div className="space-y-1.5">
            {toolCallDisplays.map((tc, i) => (
              <ToolCallIndicator key={i} toolCall={tc} accentColor={accentColor} d={d} />
            ))}
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "text-white"
              : `${d?.assistantBg || "bg-gray-50"} ${d?.assistantText || "text-gray-900"}`
          }`}
          style={isUser ? { backgroundColor: accentColor } : undefined}
        >
          {message.content ? (
            <div className="break-words">{renderMarkdown(message.content)}</div>
          ) : (
            <div className={`flex items-center gap-2 ${d?.dotsText || "text-gray-400"}`}>
              <div className="flex gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${d?.dots || "bg-gray-300"} animate-bounce`} style={{ animationDelay: "0ms" }} />
                <div className={`w-1.5 h-1.5 rounded-full ${d?.dots || "bg-gray-300"} animate-bounce`} style={{ animationDelay: "150ms" }} />
                <div className={`w-1.5 h-1.5 rounded-full ${d?.dots || "bg-gray-300"} animate-bounce`} style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Tool Call Indicator
// ============================================

function ToolCallIndicator({
  toolCall,
  accentColor,
  d,
}: {
  toolCall: ToolCallInfo;
  accentColor: string;
  d?: DarkTokens;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${d?.toolBg || "bg-gray-50"} text-xs ${d?.toolText || "text-gray-500"}`}>
      {toolCall.loading ? (
        <>
          <div
            className="w-3 h-3 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: accentColor }}
          />
          <span>
            Searching <strong>{toolCall.app}</strong>...
          </span>
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>
            <strong>{toolCall.app}</strong>: {toolCall.summary}
          </span>
        </>
      )}
    </div>
  );
}
