"use client";

// ============================================================
// App Navigation — customize this file for your app
// ============================================================
// 1. Update appName and appEmoji below
// 2. Import icons from @/components/Icons
// 3. Add a NavItem for each main feature page
// AppShell handles: sidebar, mobile drawer, user info,
// sign-out, dark mode toggle, and active state detection.
// ============================================================

import AppShell from "@/components/AppShell";
import { HomeIcon } from "@/components/Icons";

const navItems = [
  { label: "Dashboard", href: "/", icon: <HomeIcon /> },
  // Add your nav items here — one per main feature page.
  // Example:
  // { label: "Contacts", href: "/contacts", icon: <UsersIcon /> },
  // { label: "Settings", href: "/settings", icon: <CogIcon /> },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell appName="My App" appEmoji="🚀" navItems={navItems}>
      {children}
    </AppShell>
  );
}
