"use client";

import { useState, useEffect } from "react";
import StatsCard from "@/components/StatsCard";
import BarChart from "@/components/BarChart";
import StatusBadge from "@/components/StatusBadge";

interface Stats {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  monthRevenue: number;
  dailyVolume: { date: string; count: number }[];
  serviceBreakdown: { serviceName: string; count: number; color: string | null }[];
  statusBreakdown: { confirmed: number; completed: number; cancelled: number; no_show: number };
}

interface UpcomingAppointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  source: string;
  service: { name: string; color: string | null };
  provider: { staffUser: { name: string } };
  customer: { name: string; email: string };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch(`/api/appointments?status=confirmed&from=${new Date().toISOString().split("T")[0]}&limit=10`).then((r) => r.json()),
    ]).then(([statsData, appointmentsData]) => {
      setStats(statsData);
      setUpcoming(appointmentsData.appointments || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-skeleton rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-fg">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Today" value={stats?.todayCount ?? 0} subtitle="appointments" />
        <StatsCard title="This Week" value={stats?.weekCount ?? 0} subtitle="appointments" />
        <StatsCard title="This Month" value={stats?.monthCount ?? 0} subtitle="appointments" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <div className="bg-card rounded-xl border border-edge shadow-sm p-6">
          <h2 className="text-sm font-semibold text-fg-secondary mb-4">Appointment Volume (30 days)</h2>
          {stats?.dailyVolume && stats.dailyVolume.length > 0 ? (
            <BarChart
              data={stats.dailyVolume.map((d) => ({
                label: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                value: d.count,
              }))}
              color="#8b5cf6"
              height={200}
            />
          ) : (
            <p className="text-fg-dim text-sm">No data yet</p>
          )}
        </div>

        {/* Service Breakdown */}
        <div className="bg-card rounded-xl border border-edge shadow-sm p-6">
          <h2 className="text-sm font-semibold text-fg-secondary mb-4">Services This Month</h2>
          {stats?.serviceBreakdown && stats.serviceBreakdown.length > 0 ? (
            <div className="space-y-3">
              {stats.serviceBreakdown.map((s) => (
                <div key={s.serviceName} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color || "#8b5cf6" }}
                    />
                    <span className="text-sm text-fg-secondary">{s.serviceName}</span>
                  </div>
                  <span className="text-sm font-medium text-fg">{s.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-fg-dim text-sm">No appointments yet</p>
          )}
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-card rounded-xl border border-edge shadow-sm">
        <div className="px-6 py-4 border-b border-edge">
          <h2 className="text-sm font-semibold text-fg-secondary">Upcoming Appointments</h2>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-6 py-8 text-center text-fg-dim text-sm">
            No upcoming appointments
          </div>
        ) : (
          <div className="divide-y divide-divider">
            {upcoming.map((apt) => {
              const start = new Date(apt.startTime);
              const end = new Date(apt.endTime);
              return (
                <div key={apt.id} className="px-6 py-3 flex items-center gap-4">
                  <div
                    className="w-1 h-10 rounded-full"
                    style={{ backgroundColor: apt.service.color || "#8b5cf6" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-fg truncate">
                        {apt.customer.name}
                      </span>
                      <StatusBadge status={apt.status} />
                    </div>
                    <p className="text-xs text-fg-muted">
                      {apt.service.name} with {apt.provider.staffUser.name}
                    </p>
                  </div>
                  <div className="text-right text-xs text-fg-muted whitespace-nowrap">
                    <div>{start.toLocaleDateString()}</div>
                    <div>
                      {start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      {" - "}
                      {end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
