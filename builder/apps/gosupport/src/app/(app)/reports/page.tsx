import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

function hoursToHuman(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function getWeekLabel(date: Date) {
  const d = new Date(date);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getMonthKey(date: Date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const [allTickets, allUsers] = await Promise.all([
    prisma.ticket.findMany({
      where: { userId },
      include: {
        assignedTo: { select: { id: true, name: true } },
        comments: { orderBy: { createdAt: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
    }),
  ]);

  // --- Volume over time (last 3 months) ---
  const recentTickets = allTickets.filter((t) => new Date(t.createdAt) >= threeMonthsAgo);

  // Group by month
  const byMonth: Record<string, number> = {};
  recentTickets.forEach((t) => {
    const key = getMonthKey(new Date(t.createdAt));
    byMonth[key] = (byMonth[key] || 0) + 1;
  });

  // Group by week
  const byWeek: Record<string, number> = {};
  recentTickets.forEach((t) => {
    const key = getWeekLabel(new Date(t.createdAt));
    byWeek[key] = (byWeek[key] || 0) + 1;
  });

  // Fill in last 12 weeks
  const weekLabels: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    weekLabels.push(getWeekLabel(d));
  }
  const weekData = weekLabels.map((label) => ({ label, count: byWeek[label] || 0 }));
  const maxWeek = Math.max(...weekData.map((w) => w.count), 1);

  // --- Priority breakdown ---
  const priorityData = [
    { label: "Urgent", key: "URGENT" },
    { label: "High", key: "HIGH" },
    { label: "Medium", key: "MEDIUM" },
    { label: "Low", key: "LOW" },
  ].map(({ label, key }) => ({
    label,
    count: allTickets.filter((t) => t.priority === key).length,
  }));
  const maxPriority = Math.max(...priorityData.map((p) => p.count), 1);

  // --- Category breakdown ---
  const catLabels = ["GENERAL", "BILLING", "TECHNICAL", "FEATURE_REQUEST", "BUG", "OTHER"];
  const catData = catLabels.map((key) => ({
    label: key === "FEATURE_REQUEST" ? "Feature Request" : key.charAt(0) + key.slice(1).toLowerCase(),
    count: allTickets.filter((t) => t.category === key).length,
  })).filter((c) => c.count > 0);
  const maxCat = Math.max(...catData.map((c) => c.count), 1);

  // --- Resolution metrics ---
  const withFirstComment = allTickets.filter((t) => t.comments.length > 0);
  const avgResponseHours =
    withFirstComment.length > 0
      ? withFirstComment.reduce((sum, t) => {
          return sum + (new Date(t.comments[0].createdAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        }, 0) / withFirstComment.length
      : 0;

  const resolvedTickets = allTickets.filter((t) => t.resolvedAt);
  const avgResolutionHours =
    resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => {
          return sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        }, 0) / resolvedTickets.length
      : 0;

  // --- Per-agent metrics ---
  const agentResolved = allUsers.map((u) => ({
    user: u,
    resolved: allTickets.filter(
      (t) => t.assignedToId === u.id && t.status === "RESOLVED"
    ).length,
    open: allTickets.filter(
      (t) => t.assignedToId === u.id && (t.status === "OPEN" || t.status === "IN_PROGRESS")
    ).length,
    resolvedThisMonth: allTickets.filter(
      (t) =>
        t.assignedToId === u.id &&
        t.resolvedAt &&
        new Date(t.resolvedAt) >= thisMonthStart
    ).length,
  })).filter((a) => a.resolved > 0 || a.open > 0);

  // --- CSAT ---
  const ratedTickets = allTickets.filter((t) => t.satisfactionRating != null);
  const avgCsat =
    ratedTickets.length > 0
      ? ratedTickets.reduce((sum, t) => sum + (t.satisfactionRating || 0), 0) / ratedTickets.length
      : 0;

  const csatDist = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: ratedTickets.filter((t) => t.satisfactionRating === rating).length,
  }));
  const maxCsatCount = Math.max(...csatDist.map((c) => c.count), 1);

  const recentFeedback = ratedTickets
    .filter((t) => t.satisfactionComment)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  function starRating(n: number) {
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fg">Reports</h1>
        <p className="text-sm text-fg-muted">Last 90 days</p>
      </div>

      {/* Top row: key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tickets" value={allTickets.length} />
        <StatCard label="Resolved" value={resolvedTickets.length} />
        <StatCard label="Avg First Response" value={withFirstComment.length > 0 ? hoursToHuman(avgResponseHours) : "—"} />
        <StatCard label="Avg Resolution Time" value={resolvedTickets.length > 0 ? hoursToHuman(avgResolutionHours) : "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Volume by Week */}
        <div className="bg-card border border-edge rounded-xl p-5">
          <h2 className="font-semibold text-fg mb-4">Ticket Volume (last 12 weeks)</h2>
          <div className="flex items-end gap-1 h-32">
            {weekData.map((w) => (
              <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: "96px" }}>
                  <div
                    className="w-full bg-accent rounded-t transition-all"
                    style={{ height: `${(w.count / maxWeek) * 96}px`, minHeight: w.count > 0 ? "3px" : "0" }}
                  />
                </div>
                <span className="text-xs text-fg-dim hidden lg:block rotate-45 origin-left whitespace-nowrap" style={{ fontSize: "9px" }}>
                  {w.label}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-fg-muted mt-2 text-center">{recentTickets.length} tickets in the last 3 months</p>
        </div>

        {/* CSAT Distribution */}
        <div className="bg-card border border-edge rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-fg">CSAT Distribution</h2>
            <div className="text-right">
              <p className="text-2xl font-bold text-fg">{avgCsat > 0 ? avgCsat.toFixed(1) : "—"}</p>
              <p className="text-xs text-fg-muted">{ratedTickets.length} ratings</p>
            </div>
          </div>
          <div className="space-y-2">
            {csatDist.map(({ rating, count }) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-xs text-fg-muted w-4 text-right">{rating}</span>
                <span className="text-status-amber-fg text-xs w-16">{starRating(rating)}</span>
                <div className="flex-1 h-3 bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-status-amber rounded-full transition-all"
                    style={{ width: `${(count / maxCsatCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-fg-secondary w-4">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Breakdown */}
        <div className="bg-card border border-edge rounded-xl p-5">
          <h2 className="font-semibold text-fg mb-4">Tickets by Priority</h2>
          <div className="space-y-3">
            {priorityData.map(({ label, count }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-16 text-sm text-fg-secondary">{label}</span>
                <div className="flex-1 h-4 bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${(count / maxPriority) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-sm text-fg font-medium text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-card border border-edge rounded-xl p-5">
          <h2 className="font-semibold text-fg mb-4">Tickets by Category</h2>
          <div className="space-y-3">
            {catData.map(({ label, count }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-28 text-sm text-fg-secondary truncate">{label}</span>
                <div className="flex-1 h-4 bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${(count / maxCat) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-sm text-fg font-medium text-right">{count}</span>
              </div>
            ))}
            {catData.length === 0 && <p className="text-sm text-fg-muted text-center">No data yet</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Workload */}
        <div className="bg-card border border-edge rounded-xl p-5">
          <h2 className="font-semibold text-fg mb-4">Agent Workload</h2>
          {agentResolved.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-4">No agent data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="text-left py-2 text-fg-muted font-medium">Agent</th>
                    <th className="text-right py-2 text-fg-muted font-medium">Open</th>
                    <th className="text-right py-2 text-fg-muted font-medium">Resolved</th>
                    <th className="text-right py-2 text-fg-muted font-medium">This Month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {agentResolved.map(({ user, open, resolved, resolvedThisMonth }) => (
                    <tr key={user.id}>
                      <td className="py-2.5 text-fg">{user.name || user.email}</td>
                      <td className="py-2.5 text-right">
                        {open > 0 ? <span className="text-status-amber-fg font-medium">{open}</span> : <span className="text-fg-dim">0</span>}
                      </td>
                      <td className="py-2.5 text-right text-fg-secondary">{resolved}</td>
                      <td className="py-2.5 text-right">
                        <span className="text-status-green-fg font-medium">{resolvedThisMonth}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent CSAT Feedback */}
        <div className="bg-card border border-edge rounded-xl p-5">
          <h2 className="font-semibold text-fg mb-4">Recent Feedback</h2>
          {recentFeedback.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-4">No feedback yet</p>
          ) : (
            <div className="space-y-4">
              {recentFeedback.map((t) => (
                <div key={t.id} className="border-b border-edge last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-fg-muted">{t.customerName}</span>
                    <span className="text-status-amber-fg text-xs">{starRating(t.satisfactionRating!)}</span>
                  </div>
                  <p className="text-sm text-fg-secondary italic">"{t.satisfactionComment}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-edge rounded-xl p-5">
      <p className="text-xs text-fg-muted font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-fg">{value}</p>
    </div>
  );
}
