"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import type { ChannelInfo, DMInfo, CurrentUser, UserInfo } from "@/components/ChatLayout";
import CreateChannelModal from "@/components/CreateChannelModal";
import NewDMModal from "@/components/NewDMModal";
import ProfileModal from "@/components/ProfileModal";
import { useTheme } from "@/components/ThemeProvider";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface SidebarProps {
  channels: ChannelInfo[];
  dms: DMInfo[];
  currentUser: CurrentUser;
  allUsers: UserInfo[];
  activeView: "channel" | "dm";
  activeId: string | null;
  isPlatformManaged?: boolean;
  onSelectChannel: (id: string) => void;
  onSelectDM: (id: string) => void;
  onChannelCreated: (channel: ChannelInfo) => void;
  onDMCreated: (dm: DMInfo) => void;
  onOpenSearch: () => void;
  onProfileUpdated: (updated: { avatarUrl?: string | null; avatarColor?: string | null }) => void;
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

export default function Sidebar({
  channels,
  dms,
  currentUser,
  allUsers,
  activeView,
  activeId,
  isPlatformManaged,
  onSelectChannel,
  onSelectDM,
  onChannelCreated,
  onDMCreated,
  onOpenSearch,
  onProfileUpdated,
}: SidebarProps) {
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Find presence and OOO for DM users
  const userPresenceMap = new Map(allUsers.map((u) => [u.id, u.presence]));
  const userOOOMap = new Map(allUsers.map((u) => [u.id, { isOOO: u.isOOO, oooMessage: u.oooMessage }]));

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Logo / title — min-h matches MessageView header */}
      <div className="px-4 min-h-[57px] flex items-center border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold gradient-brand-text">GoChat</h1>
          </div>
          <button
            onClick={onOpenSearch}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
            title="Search (Cmd+K)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto chat-scroll py-2">
        {/* Channels section */}
        <div className="px-3 mb-4">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Channels
            </span>
            <button
              onClick={() => setShowCreateChannel(true)}
              className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
              title="Create channel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {channels.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 px-1 py-2">No channels yet</p>
          )}

          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={`
                w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors mb-0.5
                ${
                  activeView === "channel" && activeId === channel.id
                    ? "bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }
              `}
            >
              <span className={`truncate flex-1 ${channel.isMuted ? "text-gray-400 dark:text-gray-500" : ""}`}>{channel.name}</span>
              {channel.isMuted && (
                <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
              {channel.hasUnread && !channel.isMuted && (
                <span className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Direct Messages section */}
        <div className="px-3 mb-4">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Direct Messages
            </span>
            <button
              onClick={() => setShowNewDM(true)}
              className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
              title="New message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {dms.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 px-1 py-2">No conversations yet</p>
          )}

          {dms.map((dm) => {
            const presence = userPresenceMap.get(dm.otherUser.id) || "offline";
            const ooo = userOOOMap.get(dm.otherUser.id);
            return (
              <button
                key={dm.id}
                onClick={() => onSelectDM(dm.id)}
                className={`
                  w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors mb-0.5
                  ${
                    activeView === "dm" && activeId === dm.id
                      ? "bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }
                `}
                title={ooo?.isOOO && ooo.oooMessage ? `OOO: ${ooo.oooMessage}` : undefined}
              >
                {dm.otherUser.email === "claude@go4it.live" ? (
                  <svg className="w-3.5 h-3.5 flex-shrink-0 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
                  </svg>
                ) : (
                  <PresenceDot status={presence} />
                )}
                <span className="truncate flex-1">{dm.otherUser.name}</span>
                {ooo?.isOOO && (
                  <span className="text-[10px] text-orange-500 font-medium flex-shrink-0">OOO</span>
                )}
                {dm.hasUnread && (
                  <span className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current user info */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfile(true)}
            className="flex-shrink-0 rounded-lg hover:ring-2 hover:ring-purple-400 transition-all"
            title="Edit profile"
          >
            {(() => {
              const imgUrl = currentUser.image || currentUser.avatarUrl;
              const emoji = !imgUrl ? currentUser.profileEmoji : null;
              const hexBg = currentUser.profileColor || null;
              const isHex = !!hexBg?.startsWith("#");
              const twClass = currentUser.avatarColor || "bg-purple-100 dark:bg-purple-900/40";
              if (imgUrl) {
                return <img src={imgUrl} alt={currentUser.name} className="w-8 h-8 rounded-lg object-cover" />;
              }
              if (emoji) {
                return (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={isHex ? { backgroundColor: hexBg! } : undefined}>
                    {emoji}
                  </div>
                );
              }
              return (
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs ${!isHex ? twClass : ""} ${isHex || currentUser.avatarColor ? "text-white" : "text-purple-700 dark:text-purple-300"}`}
                  style={isHex ? { backgroundColor: hexBg! } : undefined}
                >
                  {getInitials(currentUser.name || currentUser.email)}
                </div>
              );
            })()}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {currentUser.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser.email}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "https://go4it.live" })}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Modals */}
      {showCreateChannel && (
        <CreateChannelModal
          onClose={() => setShowCreateChannel(false)}
          onCreated={onChannelCreated}
        />
      )}
      {showNewDM && (
        <NewDMModal
          onClose={() => setShowNewDM(false)}
          onCreated={onDMCreated}
          allUsers={allUsers}
          currentUserId={currentUser.id}
        />
      )}
      {showProfile && (
        <ProfileModal
          currentUser={currentUser}
          isPlatformManaged={isPlatformManaged}
          onClose={() => setShowProfile(false)}
          onUpdated={(updated) => {
            onProfileUpdated(updated);
            setShowProfile(false);
          }}
        />
      )}
    </div>
  );
}
