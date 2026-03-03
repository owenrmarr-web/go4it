"use client";

import AppShell from "@/components/AppShell";
import {
  HomeIcon,
  LayersIcon,
  TagIcon,
  BuildingIcon,
  ReceiptIcon,
  ListIcon,
  CogIcon,
} from "@/components/Icons";

const navItems = [
  { label: "Dashboard", href: "/", icon: <HomeIcon /> },
  { label: "Products", href: "/products", icon: <LayersIcon /> },
  { label: "Categories", href: "/categories", icon: <TagIcon /> },
  { label: "Suppliers", href: "/suppliers", icon: <BuildingIcon /> },
  { label: "Orders", href: "/orders", icon: <ReceiptIcon /> },
  { label: "Movements", href: "/movements", icon: <ListIcon /> },
  { label: "Settings", href: "/settings", icon: <CogIcon /> },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell appName="GoInventory" appEmoji="📦" navItems={navItems}>
      {children}
    </AppShell>
  );
}
