"use client";

import AppShell from "@/components/AppShell";
import { HomeIcon, FolderIcon, DocumentIcon, TagIcon, CogIcon } from "@/components/Icons";

const navItems = [
  { label: "Home", href: "/", icon: <HomeIcon /> },
  { label: "Spaces", href: "/spaces", icon: <FolderIcon /> },
  { label: "All Pages", href: "/pages", icon: <DocumentIcon /> },
  { label: "Tags", href: "/tags", icon: <TagIcon /> },
  { label: "Settings", href: "/settings", icon: <CogIcon /> },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell appName="GoWiki" appEmoji="📚" navItems={navItems}>
      {children}
    </AppShell>
  );
}
