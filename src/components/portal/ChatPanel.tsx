"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ============================================
// Types
// ============================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: string | null;
  createdAt?: string;
}

interface Conversation {
  id: string;
  title: string | null;
  updatedAt: string;
}

interface ToolCallDisplay {
  app: string;
  query?: string;
  summary?: string;
  loading: boolean;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  slug: string;
  orgName: string;
  accentColor: string;
  initialQuery?: string;
  onUsageUpdate?: (used: number, limit: number) => void;
}

// ============================================
// Main ChatPanel
// ============================================

export default function ChatPanel({
  open,
  onClose,
  slug,
  orgName,
  accentColor,
  initialQuery,
  onUsageUpdate,
}: ChatPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCallDisplay[]>([]);
  const [showList, setShowList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialQueryHandled = useRef(false);

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
    if (open) {
      loadConversations();
    }
  }, [open, loadConversations]);

  // Handle initial query from search bar
  useEffect(() => {
    if (open && initialQuery && !initialQueryHandled.current) {
      initialQueryHandled.current = true;
      setActiveConversationId(null);
      setMessages([]);
      setShowList(false);
      // Send the initial query
      sendMessage(initialQuery);
    }
    if (!open) {
      initialQueryHandled.current = false;
    }
  }, [open, initialQuery]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && !streaming) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, streaming, activeConversationId]);

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
    setToolCalls([]);

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
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: m.content || "Sorry, something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setStreaming(false);
      setToolCalls([]);
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
        onUsageUpdate?.(event.used as number, event.limit as number);
        break;

      case "text":
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + (event.content as string) }
              : m
          )
        );
        break;

      case "tool_start":
        setToolCalls((prev) => [
          ...prev,
          {
            app: event.app as string,
            query: event.query as string,
            loading: true,
          },
        ]);
        break;

      case "tool_result":
        setToolCalls((prev) =>
          prev.map((tc) =>
            tc.app === event.app && tc.loading
              ? { ...tc, summary: event.summary as string, loading: false }
              : tc
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
    setToolCalls([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  if (!open) return null;

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
              <h2 className="text-sm font-bold text-gray-900">AI Assistant</h2>
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
          <div className="flex-1 overflow-y-auto">
            <div className="p-3">
              <button
                onClick={startNewChat}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: accentColor }}
              >
                + New Conversation
              </button>
            </div>
            {conversations.length === 0 ? (
              <p className="text-center text-sm text-gray-400 mt-8">
                No conversations yet
              </p>
            ) : (
              <div className="px-3 space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors group ${
                      activeConversationId === conv.id
                        ? "bg-gray-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conv.title || "Untitled"}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(conv.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 && !streaming && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-4xl mb-3">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                      <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
                    </svg>
                  </div>
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
                />
              ))}

              {/* Tool call indicators */}
              {toolCalls.length > 0 && (
                <div className="space-y-2">
                  {toolCalls.map((tc, i) => (
                    <ToolCallIndicator key={i} toolCall={tc} accentColor={accentColor} />
                  ))}
                </div>
              )}

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
// Message Bubble
// ============================================

function MessageBubble({
  message,
  accentColor,
}: {
  message: Message;
  accentColor: string;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "text-white"
            : "bg-gray-50 text-gray-900"
        }`}
        style={isUser ? { backgroundColor: accentColor } : undefined}
      >
        {message.content ? (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
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
}: {
  toolCall: ToolCallDisplay;
  accentColor: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-500">
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
