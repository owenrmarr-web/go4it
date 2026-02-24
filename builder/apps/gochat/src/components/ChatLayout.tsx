"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import MessageView from "@/components/MessageView";
import SearchModal from "@/components/SearchModal";
import { useSSE, type SSEEvent } from "@/hooks/useSSE";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import type { MessageData } from "@/components/MessageBubble";

export interface ChannelInfo {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  memberCount: number;
  hasUnread: boolean;
  isMuted?: boolean;
}

export interface DMInfo {
  id: string;
  otherUser: {
    id: string;
    name: string;
    email: string;
  };
  lastMessage: string | null;
  hasUnread: boolean;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  presence: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  image?: string | null;
  profileColor?: string | null;
  profileEmoji?: string | null;
  title?: string | null;
  isOOO?: boolean;
  oooMessage?: string | null;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  image?: string | null;
  profileColor?: string | null;
  profileEmoji?: string | null;
  title?: string | null;
}

export interface TypingUser {
  userId: string;
  userName: string;
}

interface ChatLayoutProps {
  initialChannels: ChannelInfo[];
  initialDMs: DMInfo[];
  currentUser: CurrentUser;
  allUsers: UserInfo[];
  isPlatformManaged?: boolean;
}

export default function ChatLayout({
  initialChannels,
  initialDMs,
  currentUser,
  allUsers: initialAllUsers,
  isPlatformManaged,
}: ChatLayoutProps) {
  usePushNotifications();

  const [activeView, setActiveView] = useState<"channel" | "dm">("channel");
  const [activeId, setActiveId] = useState<string | null>(
    initialChannels.find((c) => c.isDefault)?.id || initialChannels[0]?.id || null
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [channels, setChannels] = useState<ChannelInfo[]>(initialChannels);
  const [dms, setDms] = useState<DMInfo[]>(initialDMs);
  const [searchOpen, setSearchOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser>(currentUser);
  const [allUsers, setAllUsers] = useState<UserInfo[]>(initialAllUsers);

  // SSE-sourced events for the active view — passed down to MessageView
  const [sseNewMessages, setSseNewMessages] = useState<MessageData[]>([]);
  const [sseEditedMessages, setSseEditedMessages] = useState<MessageData[]>([]);
  const [sseDeletedMessageIds, setSseDeletedMessageIds] = useState<string[]>([]);
  const [sseReactions, setSseReactions] = useState<Array<{ messageId: string; emoji: string; action: string; userId: string; userName?: string }>>([]);
  const [sseThreadReplies, setSseThreadReplies] = useState<Array<{ threadParentId: string; message: MessageData }>>([]);

  // Typing indicators
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // DM read receipts via SSE
  const [sseDmReadReceipts, setSseDmReadReceipts] = useState<
    Array<{ dmId: string; userId: string; lastReadAt: string }>
  >([]);

  // Track active view/id in refs for SSE handler
  const activeViewRef = useRef(activeView);
  const activeIdRef = useRef(activeId);
  activeViewRef.current = activeView;
  activeIdRef.current = activeId;

  // Refs for notification click handlers (avoid SSE handler deps)
  const channelsRef = useRef(channels);
  channelsRef.current = channels;
  const dmsRef = useRef(dms);
  dmsRef.current = dms;
  const handleSelectChannelRef = useRef<(id: string) => void>(() => {});
  const handleSelectDMRef = useRef<(id: string) => void>(() => {});

  // Tab badge count: update document.title and favicon badge
  const faviconImg = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    // Pre-load the base favicon image once
    if (!faviconImg.current) {
      const img = new Image();
      img.src = "/favicon.svg";
      faviconImg.current = img;
    }
  }, []);

  useEffect(() => {
    const unreadChannels = channels.filter((c) => c.hasUnread && !c.isMuted).length;
    const unreadDMs = dms.filter((d) => d.hasUnread).length;
    const total = unreadChannels + unreadDMs;
    document.title = total > 0 ? `(${total}) GoChat` : "GoChat";

    // Update favicon with badge
    const updateFavicon = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");
      if (!ctx || !faviconImg.current) return;

      ctx.drawImage(faviconImg.current, 0, 0, 32, 32);

      if (total > 0) {
        // Draw red badge circle
        const badgeText = total > 9 ? "9+" : String(total);
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(24, 8, 9, 0, 2 * Math.PI);
        ctx.fill();
        // White border
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Badge number
        ctx.fillStyle = "white";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, 24, 8.5);
      }

      // Apply to link element
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = total > 0 ? canvas.toDataURL("image/png") : "/favicon.svg";
    };

    if (faviconImg.current?.complete) {
      updateFavicon();
    } else if (faviconImg.current) {
      faviconImg.current.onload = updateFavicon;
    }
  }, [channels, dms]);

  // Request Notification permission on first user interaction
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "default") return;
    const request = () => {
      Notification.requestPermission();
    };
    document.addEventListener("click", request, { once: true });
    return () => document.removeEventListener("click", request);
  }, []);

  // Presence: POST on mount and on visibility change
  useEffect(() => {
    fetch("/api/presence", { method: "POST" }).catch(() => {});

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetch("/api/presence", { method: "POST" }).catch(() => {});
      }
    };
    const handleUnload = () => {
      navigator.sendBeacon("/api/presence", JSON.stringify({ status: "offline" }));
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  // Keyboard shortcut: Cmd+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // SSE event handler
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    const currentView = activeViewRef.current;
    const currentId = activeIdRef.current;

    switch (event.type) {
      case "new_message": {
        const msg = event.data as MessageData;
        const isActiveChannel = event.channelId && currentView === "channel" && event.channelId === currentId;
        const isActiveDM = event.dmId && currentView === "dm" && event.dmId === currentId;

        if (isActiveChannel || isActiveDM) {
          setSseNewMessages((prev) => [...prev, msg]);
          // Clear typing for this user
          const typingKey = `${event.channelId || event.dmId}:${event.userId}`;
          setTypingUsers((prev) => prev.filter((t) => `${event.channelId || event.dmId}:${t.userId}` !== typingKey));
          const timeout = typingTimeouts.current.get(typingKey);
          if (timeout) { clearTimeout(timeout); typingTimeouts.current.delete(typingKey); }
        } else {
          // Update sidebar unread
          if (event.channelId) {
            setChannels((prev) =>
              prev.map((c) => (c.id === event.channelId ? { ...c, hasUnread: true } : c))
            );
          }
          if (event.dmId) {
            setDms((prev) =>
              prev.map((d) => (d.id === event.dmId ? { ...d, hasUnread: true } : d))
            );
          }
        }

        // Browser notification: when not active or tab hidden
        const shouldNotify = !(isActiveChannel || isActiveDM) || document.hidden;
        const isMuted = event.channelId && channelsRef.current.find((c) => c.id === event.channelId)?.isMuted;
        if (shouldNotify && !isMuted && typeof Notification !== "undefined" && Notification.permission === "granted") {
          let notifTitle: string;
          if (event.channelId) {
            const ch = channelsRef.current.find((c) => c.id === event.channelId);
            notifTitle = ch ? `#${ch.name}` : "New message";
          } else {
            notifTitle = event.userName || "New DM";
          }
          const body = typeof msg.content === "string"
            ? msg.content.slice(0, 100) + (msg.content.length > 100 ? "..." : "")
            : "New message";
          const notif = new Notification(notifTitle, {
            body: event.channelId ? `${event.userName}: ${body}` : body,
            tag: event.channelId || event.dmId || "gochat",
          });
          notif.onclick = () => {
            window.focus();
            if (event.channelId) handleSelectChannelRef.current(event.channelId);
            else if (event.dmId) handleSelectDMRef.current(event.dmId);
            notif.close();
          };
          setTimeout(() => notif.close(), 5000);
        }
        break;
      }

      case "message_edited": {
        const msg = event.data as MessageData;
        const isActive =
          (event.channelId && currentView === "channel" && event.channelId === currentId) ||
          (event.dmId && currentView === "dm" && event.dmId === currentId);
        if (isActive) {
          setSseEditedMessages((prev) => [...prev, msg]);
        }
        break;
      }

      case "message_deleted": {
        const { messageId, message } = event.data as { messageId: string; message: MessageData };
        const isActive =
          (event.channelId && currentView === "channel" && event.channelId === currentId) ||
          (event.dmId && currentView === "dm" && event.dmId === currentId);
        if (isActive) {
          setSseDeletedMessageIds((prev) => [...prev, messageId]);
          setSseEditedMessages((prev) => [...prev, message]);
        }
        break;
      }

      case "reaction": {
        const reactionData = event.data as { messageId: string; emoji: string; action: string };
        const isActive =
          (event.channelId && currentView === "channel" && event.channelId === currentId) ||
          (event.dmId && currentView === "dm" && event.dmId === currentId);
        if (isActive) {
          setSseReactions((prev) => [...prev, { ...reactionData, userId: event.userId, userName: event.userName }]);
        }
        break;
      }

      case "typing": {
        const targetId = event.channelId || event.dmId;
        const isActive =
          (event.channelId && currentView === "channel" && event.channelId === currentId) ||
          (event.dmId && currentView === "dm" && event.dmId === currentId);

        if (isActive && targetId) {
          const typingKey = `${targetId}:${event.userId}`;

          // Clear existing timeout
          const existingTimeout = typingTimeouts.current.get(typingKey);
          if (existingTimeout) clearTimeout(existingTimeout);

          // Add typing user
          setTypingUsers((prev) => {
            if (prev.some((t) => t.userId === event.userId)) return prev;
            return [...prev, { userId: event.userId, userName: event.userName || "Someone" }];
          });

          // Set timeout to remove after 3s
          const timeout = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((t) => t.userId !== event.userId));
            typingTimeouts.current.delete(typingKey);
          }, 3000);
          typingTimeouts.current.set(typingKey, timeout);
        }
        break;
      }

      case "presence": {
        const { userId, status } = event.data as { userId: string; status: string };
        setAllUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, presence: status } : u))
        );
        break;
      }

      case "thread_reply": {
        const msg = event.data as MessageData;
        if (event.channelId && currentView === "channel" && event.channelId === currentId && event.threadParentId) {
          setSseThreadReplies((prev) => [...prev, { threadParentId: event.threadParentId!, message: msg }]);
        }
        break;
      }

      case "dm_read": {
        const readData = event.data as { dmId: string; userId: string; lastReadAt: string };
        if (currentView === "dm" && event.dmId === currentId) {
          setSseDmReadReceipts((prev) => {
            const filtered = prev.filter((r) => r.userId !== readData.userId);
            return [...filtered, readData];
          });
        }
        break;
      }
    }
  }, []);

  useSSE(handleSSEEvent);

  // Clear SSE state when switching views
  useEffect(() => {
    setSseNewMessages([]);
    setSseEditedMessages([]);
    setSseDeletedMessageIds([]);
    setSseReactions([]);
    setSseThreadReplies([]);
    setSseDmReadReceipts([]);
    setTypingUsers([]);
    // Clear all typing timeouts
    typingTimeouts.current.forEach((t) => clearTimeout(t));
    typingTimeouts.current.clear();
  }, [activeView, activeId]);

  const handleSelectChannel = useCallback((channelId: string) => {
    setActiveView("channel");
    setActiveId(channelId);
    setSidebarOpen(false);
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, hasUnread: false } : c))
    );
  }, []);
  handleSelectChannelRef.current = handleSelectChannel;

  const handleSelectDM = useCallback((dmId: string) => {
    setActiveView("dm");
    setActiveId(dmId);
    setSidebarOpen(false);
    setDms((prev) =>
      prev.map((d) => (d.id === dmId ? { ...d, hasUnread: false } : d))
    );
  }, []);
  handleSelectDMRef.current = handleSelectDM;

  const handleChannelCreated = useCallback((channel: ChannelInfo) => {
    setChannels((prev) => [...prev, channel]);
    setActiveView("channel");
    setActiveId(channel.id);
  }, []);

  const handleDMCreated = useCallback((dm: DMInfo) => {
    setDms((prev) => {
      const existing = prev.find((d) => d.id === dm.id);
      if (existing) return prev;
      return [dm, ...prev];
    });
    setActiveView("dm");
    setActiveId(dm.id);
  }, []);

  const handleSearchNavigate = useCallback(
    (type: "channel" | "dm", id: string) => {
      setActiveView(type);
      setActiveId(id);
      setSearchOpen(false);
    },
    []
  );

  const handleProfileUpdated = useCallback(
    (updated: { avatarUrl?: string | null; avatarColor?: string | null }) => {
      setUser((prev) => ({ ...prev, ...updated }));
    },
    []
  );

  const handleChannelUpdated = useCallback(
    (updated: Partial<ChannelInfo> & { id: string }) => {
      setChannels((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
    },
    []
  );

  const activeChannel =
    activeView === "channel"
      ? channels.find((c) => c.id === activeId) || null
      : null;

  const activeDM =
    activeView === "dm" ? dms.find((d) => d.id === activeId) || null : null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar
          channels={channels}
          dms={dms}
          currentUser={user}
          allUsers={allUsers}
          activeView={activeView}
          activeId={activeId}
          isPlatformManaged={isPlatformManaged}
          onSelectChannel={handleSelectChannel}
          onSelectDM={handleSelectDM}
          onChannelCreated={handleChannelCreated}
          onDMCreated={handleDMCreated}
          onOpenSearch={() => setSearchOpen(true)}
          onProfileUpdated={handleProfileUpdated}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {activeChannel
              ? activeChannel.name
              : activeDM
              ? activeDM.otherUser.name
              : "GoChat"}
          </span>
        </div>

        {activeId ? (
          <MessageView
            key={`${activeView}-${activeId}`}
            type={activeView}
            id={activeId}
            channel={activeChannel}
            dm={activeDM}
            currentUser={user}
            allUsers={allUsers}
            onChannelUpdated={handleChannelUpdated}
            sseNewMessages={sseNewMessages}
            sseEditedMessages={sseEditedMessages}
            sseDeletedMessageIds={sseDeletedMessageIds}
            sseReactions={sseReactions}
            sseThreadReplies={sseThreadReplies}
            sseDmReadReceipts={sseDmReadReceipts}
            typingUsers={typingUsers}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-brand flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Welcome to GoChat</h2>
              <p className="text-gray-500 dark:text-gray-400">Select a channel or start a conversation</p>
            </div>
          </div>
        )}
      </div>

      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          onNavigate={handleSearchNavigate}
          channels={channels}
          dms={dms}
        />
      )}
    </div>
  );
}
