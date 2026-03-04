"use client";

import AppShell from "@/components/AppShell";
import {
  HomeIcon,
  ReceiptIcon,
  DocumentIcon,
  UsersIcon,
  CurrencyIcon,
  TagIcon,
  ChartBarIcon,
  CogIcon,
} from "@/components/Icons";

const navItems = [
  { label: "Dashboard", href: "/", icon: <HomeIcon /> },
  { label: "Invoices", href: "/invoices", icon: <ReceiptIcon /> },
  { label: "Estimates", href: "/estimates", icon: <DocumentIcon /> },
  { label: "Clients", href: "/clients", icon: <UsersIcon /> },
  { label: "Payments", href: "/payments", icon: <CurrencyIcon /> },
  { label: "Expenses", href: "/expenses", icon: <TagIcon /> },
  { label: "Reports", href: "/reports", icon: <ChartBarIcon /> },
  { label: "Settings", href: "/settings", icon: <CogIcon /> },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell appName="GoInvoice" appEmoji="💰" navItems={navItems}>
      {children}
    </AppShell>
  );
}
