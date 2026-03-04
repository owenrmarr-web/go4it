"use client";

import AppShell from "@/components/AppShell";
import {
  HomeIcon,
  DocumentIcon,
  InboxIcon,
  ChartBarIcon,
  CogIcon,
} from "@/components/Icons";

const navItems = [
  { label: "Dashboard", href: "/", icon: <HomeIcon /> },
  { label: "Forms", href: "/forms", icon: <DocumentIcon /> },
  { label: "Submissions", href: "/submissions", icon: <InboxIcon /> },
  { label: "Analytics", href: "/analytics", icon: <ChartBarIcon /> },
  { label: "Settings", href: "/settings", icon: <CogIcon /> },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell appName="GoForms" appEmoji="📝" navItems={navItems}>
      {children}
    </AppShell>
  );
}
