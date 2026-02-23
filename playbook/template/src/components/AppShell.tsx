"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import UserAvatar from "./UserAvatar";
import ThemeToggle from "./ThemeToggle";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface AppShellProps {
  appName: string;
  appEmoji?: string;
  navItems: NavItem[];
  children: React.ReactNode;
}

export default function AppShell({
  appName,
  appEmoji,
  navItems,
  children,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Top: App name — links to home */}
      <div className="px-4 py-5 border-b border-edge">
        <Link
          href="/"
          onClick={() => setDrawerOpen(false)}
          className="flex items-center gap-2.5 text-fg font-bold text-lg hover:opacity-80 transition-opacity"
        >
          {appEmoji && <span className="text-xl">{appEmoji}</span>}
          <span className="truncate">{appName}</span>
        </Link>
      </div>

      {/* Middle: Nav items — Claude fills these */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setDrawerOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-accent-soft text-accent-fg"
                : "text-fg-secondary hover:bg-hover hover:text-fg"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="ml-auto bg-accent text-white text-xs rounded-full min-w-[20px] text-center px-1.5 py-0.5">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom: User info, sign out, theme toggle */}
      <div className="p-3 border-t border-edge space-y-1">
        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <UserAvatar
              name={user.name || user.email || "User"}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fg truncate">
                {user.name || user.email}
              </p>
              {user.name && user.email && (
                <p className="text-xs text-fg-muted truncate">{user.email}</p>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 px-1">
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: "/auth" })}
            className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-hover rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
              />
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-card border-r border-edge flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-backdrop"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-card shadow-xl z-50 animate-slide-in">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-edge">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-lg hover:bg-hover text-fg-secondary"
            aria-label="Open menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
          <span className="font-semibold text-fg truncate">
            {appEmoji && <span className="mr-1.5">{appEmoji}</span>}
            {appName}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
