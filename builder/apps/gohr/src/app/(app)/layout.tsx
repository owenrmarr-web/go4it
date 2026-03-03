"use client";

import AppShell from "@/components/AppShell";
import {
  HomeIcon,
  UsersIcon,
  BuildingIcon,
  CalendarIcon,
  ClockIcon,
  DocumentIcon,
  CheckCircleIcon,
  BellIcon,
  CogIcon,
} from "@/components/Icons";

const navItems = [
  { label: "Dashboard", href: "/", icon: <HomeIcon /> },
  { label: "Directory", href: "/directory", icon: <UsersIcon /> },
  { label: "Departments", href: "/departments", icon: <BuildingIcon /> },
  { label: "Time Off", href: "/time-off", icon: <CalendarIcon /> },
  { label: "Timekeeping", href: "/timekeeping", icon: <ClockIcon /> },
  { label: "Documents", href: "/documents", icon: <DocumentIcon /> },
  { label: "Onboarding", href: "/onboarding", icon: <CheckCircleIcon /> },
  { label: "Announcements", href: "/announcements", icon: <BellIcon /> },
  { label: "Settings", href: "/settings", icon: <CogIcon /> },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell appName="GoHR" appEmoji="👥" navItems={navItems}>
      {children}
    </AppShell>
  );
}
