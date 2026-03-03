"use client";

import { UsersIcon, CalendarIcon, ClockIcon, CheckCircleIcon, BellIcon } from "@/components/Icons";
import Badge from "@/components/Badge";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";

interface DashboardProps {
  stats: {
    totalEmployees: number;
    pendingTimeOff: number;
    onLeaveToday: number;
    openOnboarding: number;
  };
  upcomingTimeOff: Array<{
    id: string;
    type: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    profile: {
      user: { name: string | null; image: string | null; profileColor: string | null; profileEmoji: string | null };
    };
  }>;
  recentAnnouncements: Array<{
    id: string;
    title: string;
    content: string;
    priority: string;
    publishDate: string;
    pinned: boolean;
  }>;
  activeClockIns: Array<{
    id: string;
    clockIn: string;
    profile: {
      user: { name: string | null; image: string | null; profileColor: string | null; profileEmoji: string | null };
    };
  }>;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getElapsedTime(clockIn: string) {
  const diff = Date.now() - new Date(clockIn).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

const priorityVariant: Record<string, "neutral" | "success" | "warning" | "error"> = {
  NORMAL: "neutral",
  IMPORTANT: "warning",
  URGENT: "error",
};

const timeOffTypeBadge: Record<string, "info" | "warning" | "success" | "error" | "neutral"> = {
  VACATION: "info",
  SICK: "error",
  PERSONAL: "warning",
  BEREAVEMENT: "neutral",
  OTHER: "neutral",
};

export default function DashboardClient({
  stats,
  upcomingTimeOff,
  recentAnnouncements,
  activeClockIns,
}: DashboardProps) {
  const statCards = [
    { label: "Active Employees", value: stats.totalEmployees, icon: <UsersIcon />, color: "text-accent-fg", href: "/directory" },
    { label: "Pending Time Off", value: stats.pendingTimeOff, icon: <CalendarIcon />, color: "text-status-amber-fg", href: "/time-off" },
    { label: "On Leave Today", value: stats.onLeaveToday, icon: <CalendarIcon />, color: "text-status-blue-fg", href: "/time-off" },
    { label: "Open Onboarding", value: stats.openOnboarding, icon: <CheckCircleIcon />, color: "text-status-green-fg", href: "/onboarding" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-fg">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-card border border-edge rounded-xl p-5 hover:bg-hover transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-fg-muted text-sm">{card.label}</p>
                <p className="text-2xl font-bold text-fg mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} opacity-60`}>{card.icon}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Time Off */}
        <div className="bg-card border border-edge rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-fg">Upcoming Time Off</h2>
            <Link href="/time-off" className="text-sm text-accent-fg hover:underline">
              View all
            </Link>
          </div>
          {upcomingTimeOff.length === 0 ? (
            <p className="text-fg-muted text-sm">No upcoming time off in the next 7 days.</p>
          ) : (
            <div className="space-y-3">
              {upcomingTimeOff.map((req) => (
                <div key={req.id} className="flex items-center gap-3 py-2">
                  <UserAvatar name={req.profile.user.name || ""} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">
                      {req.profile.user.name}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {formatDate(req.startDate)} – {formatDate(req.endDate)} · {req.totalDays}d
                    </p>
                  </div>
                  <Badge variant={timeOffTypeBadge[req.type] || "neutral"}>
                    {req.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Announcements */}
        <div className="bg-card border border-edge rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-fg">Recent Announcements</h2>
            <Link href="/announcements" className="text-sm text-accent-fg hover:underline">
              View all
            </Link>
          </div>
          {recentAnnouncements.length === 0 ? (
            <p className="text-fg-muted text-sm">No announcements yet.</p>
          ) : (
            <div className="space-y-3">
              {recentAnnouncements.map((ann) => (
                <div key={ann.id} className="py-2 border-b border-edge last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    {ann.pinned && <span className="text-xs">📌</span>}
                    <h3 className="text-sm font-medium text-fg">{ann.title}</h3>
                    <Badge variant={priorityVariant[ann.priority] || "neutral"}>
                      {ann.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-fg-muted line-clamp-2">{ann.content}</p>
                  <p className="text-xs text-fg-dim mt-1">
                    {formatDate(ann.publishDate)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Clock-Ins */}
        <div className="bg-card border border-edge rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-fg">Active Clock-Ins</h2>
            <Link href="/timekeeping" className="text-sm text-accent-fg hover:underline">
              View all
            </Link>
          </div>
          {activeClockIns.length === 0 ? (
            <p className="text-fg-muted text-sm">No one is currently clocked in.</p>
          ) : (
            <div className="space-y-3">
              {activeClockIns.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-2">
                  <UserAvatar name={entry.profile.user.name || ""} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">
                      {entry.profile.user.name}
                    </p>
                    <p className="text-xs text-fg-muted">
                      Clocked in at{" "}
                      {new Date(entry.clockIn).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-status-green animate-pulse" />
                    <span className="text-sm font-medium text-status-green-fg">
                      {getElapsedTime(entry.clockIn)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
