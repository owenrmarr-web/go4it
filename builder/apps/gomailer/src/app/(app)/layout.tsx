"use client";

import AppShell from "@/components/AppShell";
import {
  HomeIcon,
  EnvelopeIcon,
  DocumentIcon,
  UsersIcon,
  ListIcon,
  CogIcon,
} from "@/components/Icons";

const navItems = [
  { label: "Dashboard", href: "/", icon: <HomeIcon /> },
  { label: "Campaigns", href: "/campaigns", icon: <EnvelopeIcon /> },
  { label: "Templates", href: "/templates", icon: <DocumentIcon /> },
  { label: "Lists", href: "/lists", icon: <UsersIcon /> },
  { label: "Send History", href: "/history", icon: <ListIcon /> },
  { label: "Settings", href: "/settings", icon: <CogIcon /> },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell appName="GoMailer" appEmoji="📧" navItems={navItems}>
      {children}
    </AppShell>
  );
}
