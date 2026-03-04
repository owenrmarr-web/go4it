"use client";

import AppShell from "@/components/AppShell";
import { HomeIcon, DocumentIcon, FolderIcon, LayersIcon, CogIcon } from "@/components/Icons";

const navItems = [
  { label: "Dashboard", href: "/", icon: <HomeIcon /> },
  { label: "Documents", href: "/documents", icon: <DocumentIcon /> },
  { label: "Folders", href: "/folders", icon: <FolderIcon /> },
  { label: "Templates", href: "/templates", icon: <LayersIcon /> },
  { label: "Settings", href: "/settings", icon: <CogIcon /> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell appName="GoDocs" appEmoji="📄" navItems={navItems}>
      {children}
    </AppShell>
  );
}
