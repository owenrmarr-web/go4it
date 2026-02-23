import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalContacts,
    totalCompanies,
    openDeals,
    tasksDueToday,
    overdueTasks,
    activitiesThisWeek,
    dealsByStage,
    recentActivities,
    todaysTasks,
  ] = await Promise.all([
    prisma.contact.count({ where: { userId } }),
    prisma.company.count({ where: { userId } }),
    prisma.deal.findMany({
      where: { userId, stage: { notIn: ["WON", "LOST"] } },
    }),
    prisma.task.count({
      where: {
        userId,
        completed: false,
        dueDate: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        completed: false,
        dueDate: { lt: todayStart },
      },
    }),
    prisma.activity.count({
      where: { userId, date: { gte: weekAgo } },
    }),
    prisma.deal.groupBy({
      by: ["stage"],
      where: { userId },
      _count: true,
      _sum: { value: true },
    }),
    prisma.activity.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        contact: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        userId,
        completed: false,
        dueDate: { gte: todayStart, lt: todayEnd },
      },
      include: {
        contact: { select: { firstName: true, lastName: true } },
        deal: { select: { title: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const openDealsValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const openDealsCount = openDeals.length;

  const stageOrder = ["INTERESTED", "QUOTED", "COMMITTED", "WON", "LOST"];
  const pipelineData = stageOrder.map((stage) => {
    const found = dealsByStage.find((d) => d.stage === stage);
    return {
      stage,
      count: found?._count ?? 0,
      totalValue: found?._sum?.value ?? 0,
    };
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-text-muted">Contacts</p>
              <p className="text-2xl font-bold text-text-primary">{totalContacts}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-text-muted">Open Pipeline</p>
              <p className="text-2xl font-bold text-text-primary">
                ${openDealsValue.toLocaleString()}
              </p>
              <p className="text-xs text-text-faint">{openDealsCount} deals</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-text-muted">Tasks Due Today</p>
              <p className="text-2xl font-bold text-text-primary">{tasksDueToday}</p>
              {overdueTasks > 0 && (
                <p className="text-xs text-red-500">{overdueTasks} overdue</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-text-muted">Activities This Week</p>
              <p className="text-2xl font-bold text-text-primary">{activitiesThisWeek}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Pipeline Overview</h2>
        <div className="space-y-3">
          {pipelineData.map((item) => {
            const maxValue = Math.max(...pipelineData.map((d) => d.totalValue), 1);
            const width = Math.max((item.totalValue / maxValue) * 100, 2);
            const colors: Record<string, string> = {
              INTERESTED: "bg-blue-500",
              QUOTED: "bg-orange-500",
              COMMITTED: "bg-purple-500",
              WON: "bg-green-500",
              LOST: "bg-red-400",
            };
            return (
              <div key={item.stage} className="flex items-center gap-3">
                <span className="text-sm text-text-secondary w-24 shrink-0">
                  {item.stage.charAt(0) + item.stage.slice(1).toLowerCase()}
                </span>
                <div className="flex-1 bg-hover-bg rounded-full h-6 relative overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colors[item.stage] || "bg-gray-400"} transition-all`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-text-secondary w-28 text-right shrink-0">
                  ${item.totalValue.toLocaleString()} ({item.count})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Tasks */}
        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Today&apos;s Tasks</h2>
            <a href="/tasks" className="text-sm text-purple-600 hover:text-purple-700">
              View all
            </a>
          </div>
          <DashboardClient tasks={todaysTasks} />
        </div>

        {/* Recent Activity */}
        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Recent Activity</h2>
            <a href="/contacts" className="text-sm text-purple-600 hover:text-purple-700">
              View all
            </a>
          </div>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-text-faint text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => {
                const icons: Record<string, { bg: string; color: string; label: string }> = {
                  CALL: { bg: "bg-green-50", color: "text-green-600", label: "Call" },
                  EMAIL: { bg: "bg-blue-50", color: "text-blue-600", label: "Email" },
                  MEETING: { bg: "bg-purple-50", color: "text-purple-600", label: "Meeting" },
                  NOTE: { bg: "bg-yellow-50", color: "text-yellow-600", label: "Note" },
                };
                const icon = icons[activity.type] || icons.NOTE;
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 ${icon.bg} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
                      <span className={`text-xs font-medium ${icon.color}`}>
                        {icon.label.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary truncate">{activity.subject}</p>
                      <p className="text-xs text-text-muted">
                        {activity.contact.firstName} {activity.contact.lastName}
                        {" · "}
                        {new Date(activity.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
