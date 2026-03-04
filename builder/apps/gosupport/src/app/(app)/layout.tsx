"use client";

import AppShell from "@/components/AppShell";
import {
  HomeIcon,
  InboxIcon,
  DocumentIcon,
  ChatBubbleIcon,
  ChartBarIcon,
  CogIcon,
} from "@/components/Icons";

const navItems = [
  { label: "Dashboard", href: "/", icon: <HomeIcon /> },
  { label: "Tickets", href: "/tickets", icon: <InboxIcon /> },
  { label: "Knowledge Base", href: "/kb", icon: <DocumentIcon /> },
  { label: "Canned Replies", href: "/canned", icon: <ChatBubbleIcon /> },
  { label: "Reports", href: "/reports", icon: <ChartBarIcon /> },
  { label: "Settings", href: "/settings", icon: <CogIcon /> },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell appName="GoSupport" appEmoji="🎧" navItems={navItems}>
      {children}
    </AppShell>
  );
}
