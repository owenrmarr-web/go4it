import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import PipelineChart from "@/components/reports/PipelineChart";
import ActivityDonut from "@/components/reports/ActivityDonut";
import WeeklyActivityChart from "@/components/reports/WeeklyActivityChart";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;
  const now = new Date();

  // --- 1. Pipeline Value by Stage ---
  const dealsByStage = await prisma.deal.groupBy({
    by: ["stage"],
    where: { userId },
    _count: true,
    _sum: { value: true },
  });

  const stageOrder = ["INTERESTED", "QUOTED", "COMMITTED", "WON", "LOST"];
  const pipelineData = stageOrder.map((stage) => {
    const found = dealsByStage.find((d) => d.stage === stage);
    return {
      stage,
      count: found?._count ?? 0,
      totalValue: found?._sum?.value ?? 0,
    };
  });

  // --- 2. Activity Breakdown by Type ---
  const activityByType = await prisma.activity.groupBy({
    by: ["type"],
    where: { userId },
    _count: true,
  });

  const activityTypes = ["CALL", "EMAIL", "MEETING", "NOTE"];
  const activityBreakdown = activityTypes.map((type) => {
    const found = activityByType.find((a) => a.type === type);
    return {
      type,
      count: found?._count ?? 0,
    };
  });

  // --- 3. Activities Over Time (last 4 weeks) ---
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const recentActivities = await prisma.activity.findMany({
    where: {
      userId,
      date: { gte: fourWeeksAgo },
    },
    select: { date: true },
  });

  // Bucket into 4 weeks
  const weekBuckets: { label: string; count: number }[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const count = recentActivities.filter((a) => {
      const d = new Date(a.date);
      return d >= weekStart && d < weekEnd;
    }).length;

    const startLabel = weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endLabel = new Date(weekEnd.getTime() - 86400000).toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric" }
    );

    weekBuckets.push({
      label: `${startLabel} - ${endLabel}`,
      count,
    });
  }

  // --- 4. Deal Win/Loss Rate ---
  const wonDeals = await prisma.deal.count({
    where: { userId, stage: "WON" },
  });
  const lostDeals = await prisma.deal.count({
    where: { userId, stage: "LOST" },
  });
  const totalClosed = wonDeals + lostDeals;
  const winRate = totalClosed > 0 ? Math.round((wonDeals / totalClosed) * 100) : 0;

  // --- 5. Top Contacts by Deal Value ---
  const topContactDeals = await prisma.deal.groupBy({
    by: ["contactId"],
    where: { userId },
    _sum: { value: true },
    _count: true,
    orderBy: { _sum: { value: "desc" } },
    take: 5,
  });

  const topContactIds = topContactDeals.map((d) => d.contactId);
  const topContactsInfo = await prisma.contact.findMany({
    where: { id: { in: topContactIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: { select: { name: true } },
    },
  });

  const contactMap = new Map(topContactsInfo.map((c) => [c.id, c]));
  const topContacts = topContactDeals.map((d, i) => {
    const contact = contactMap.get(d.contactId);
    return {
      rank: i + 1,
      name: contact
        ? `${contact.firstName} ${contact.lastName}`
        : "Unknown",
      company: contact?.company?.name || null,
      totalValue: d._sum?.value ?? 0,
      dealCount: d._count ?? 0,
    };
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Reports</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Pipeline Value by Stage */}
        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Pipeline Value by Stage
          </h2>
          <PipelineChart data={pipelineData} />
        </div>

        {/* 2. Activity Breakdown */}
        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Activity Breakdown
          </h2>
          <ActivityDonut data={activityBreakdown} />
        </div>

        {/* 3. Activities Over Time */}
        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Activities Over Time
          </h2>
          <WeeklyActivityChart data={weekBuckets} />
        </div>

        {/* 4. Deal Win/Loss Rate */}
        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Deal Win/Loss Rate
          </h2>
          {totalClosed === 0 ? (
            <p className="text-sm text-text-faint text-center py-8">
              No closed deals yet
            </p>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="text-5xl font-bold text-text-primary mb-1">
                {winRate}%
              </div>
              <p className="text-sm text-text-muted mb-6">Win Rate</p>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {wonDeals}
                  </div>
                  <p className="text-xs text-text-muted mt-1">Won</p>
                </div>
                <div className="w-px h-10 bg-hover-bg" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {lostDeals}
                  </div>
                  <p className="text-xs text-text-muted mt-1">Lost</p>
                </div>
                <div className="w-px h-10 bg-hover-bg" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-secondary">
                    {totalClosed}
                  </div>
                  <p className="text-xs text-text-muted mt-1">Total Closed</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Top Contacts by Deal Value */}
        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Top Contacts by Deal Value
          </h2>
          {topContacts.length === 0 ? (
            <p className="text-sm text-text-faint text-center py-8">
              No deal data yet
            </p>
          ) : (
            <div className="space-y-3">
              {topContacts.map((item) => (
                <div
                  key={item.rank}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-hover-bg transition-colors"
                >
                  {/* Rank */}
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-purple-600">
                      {item.rank}
                    </span>
                  </div>

                  {/* Name and company */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {item.name}
                    </p>
                    {item.company && (
                      <p className="text-xs text-text-muted truncate">
                        {item.company}
                      </p>
                    )}
                  </div>

                  {/* Value and count */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-text-primary">
                      ${item.totalValue.toLocaleString()}
                    </p>
                    <p className="text-xs text-text-faint">
                      {item.dealCount} deal{item.dealCount !== 1 ? "s" : ""}
                    </p>
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
