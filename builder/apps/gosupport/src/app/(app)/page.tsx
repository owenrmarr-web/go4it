import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import Badge from "@/components/Badge";
import UserAvatar from "@/components/UserAvatar";
import { ClockIcon, CheckCircleIcon, InboxIcon, UsersIcon } from "@/components/Icons";

function priorityVariant(p: string): "error" | "warning" | "info" | "neutral" {
  if (p === "URGENT") return "error";
  if (p === "HIGH") return "warning";
  if (p === "MEDIUM") return "info";
  return "neutral";
}

function statusVariant(s: string): "info" | "warning" | "success" | "neutral" {
  if (s === "OPEN") return "info";
  if (s === "IN_PROGRESS") return "warning";
  if (s === "RESOLVED") return "success";
  return "neutral";
}

function statusLabel(s: string) {
  if (s === "IN_PROGRESS") return "In Progress";
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function hoursAgo(d: Date) {
  return Math.round((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60));
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;

  const [allTickets, recentTickets, overdueWaiting] = await Promise.all([
    prisma.ticket.findMany({
      where: { userId },
      include: {
        comments: { orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
    prisma.ticket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        assignedTo: {
          select: { id: true, name: true, profileColor: true, profileEmoji: true, image: true },
        },
      },
    }),
    prisma.ticket.findMany({
      where: {
        userId,
        status: "WAITING",
        updatedAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      orderBy: { updatedAt: "asc" },
      include: {
        assignedTo: {
          select: { id: true, name: true, profileColor: true, profileEmoji: true, image: true },
        },
      },
    }),
  ]);

  const openCount = allTickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const unassignedCount = allTickets.filter((t) => !t.assignedToId && t.status !== "CLOSED").length;

  const withFirstComment = allTickets.filter((t) => t.comments.length > 0);
  const avgResponseHours =
    withFirstComment.length > 0
      ? withFirstComment.reduce((sum, t) => {
          return sum + (new Date(t.comments[0].createdAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        }, 0) / withFirstComment.length
      : 0;

  const formattedAvgResponse =
    avgResponseHours < 1
      ? `${Math.round(avgResponseHours * 60)}m`
      : avgResponseHours < 24
      ? `${avgResponseHours.toFixed(1)}h`
      : `${(avgResponseHours / 24).toFixed(1)}d`;

  const ratedTickets = allTickets.filter((t) => t.satisfactionRating != null);
  const avgCsat =
    ratedTickets.length > 0
      ? (ratedTickets.reduce((sum, t) => sum + (t.satisfactionRating || 0), 0) / ratedTickets.length).toFixed(1)
      : null;

  const openTickets = allTickets.filter((t) => t.status !== "CLOSED");
  const priorityCounts = {
    URGENT: openTickets.filter((t) => t.priority === "URGENT").length,
    HIGH: openTickets.filter((t) => t.priority === "HIGH").length,
    MEDIUM: openTickets.filter((t) => t.priority === "MEDIUM").length,
    LOW: openTickets.filter((t) => t.priority === "LOW").length,
  };
  const maxPriorityCount = Math.max(...Object.values(priorityCounts), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-edge rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-status-blue flex items-center justify-center">
              <InboxIcon className="w-5 h-5 text-status-blue-fg" />
            </div>
            <span className="text-sm text-fg-muted font-medium">Open Tickets</span>
          </div>
          <p className="text-3xl font-bold text-fg">{openCount}</p>
          <p className="text-xs text-fg-muted mt-1">open or in progress</p>
        </div>

        <div className="bg-card border border-edge rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-status-amber flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-status-amber-fg" />
            </div>
            <span className="text-sm text-fg-muted font-medium">Unassigned</span>
          </div>
          <p className="text-3xl font-bold text-fg">{unassignedCount}</p>
          <p className="text-xs text-fg-muted mt-1">need assignment</p>
        </div>

        <div className="bg-card border border-edge rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-elevated flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-fg-secondary" />
            </div>
            <span className="text-sm text-fg-muted font-medium">Avg Response</span>
          </div>
          <p className="text-3xl font-bold text-fg">
            {withFirstComment.length > 0 ? formattedAvgResponse : "—"}
          </p>
          <p className="text-xs text-fg-muted mt-1">time to first reply</p>
        </div>

        <div className="bg-card border border-edge rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-status-green flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-status-green-fg" />
            </div>
            <span className="text-sm text-fg-muted font-medium">CSAT Score</span>
          </div>
          <p className="text-3xl font-bold text-fg">{avgCsat ? `${avgCsat}/5` : "—"}</p>
          <p className="text-xs text-fg-muted mt-1">{ratedTickets.length} rating{ratedTickets.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <div className="lg:col-span-2 bg-card border border-edge rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-edge">
            <h2 className="font-semibold text-fg">Recent Tickets</h2>
            <Link href="/tickets" className="text-sm text-accent-fg hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-edge">
            {recentTickets.length === 0 ? (
              <p className="p-5 text-sm text-fg-muted text-center">
                No tickets yet.{" "}
                <Link href="/tickets" className="text-accent-fg hover:underline">Create one</Link>
              </p>
            ) : (
              recentTickets.map((t) => (
                <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-center gap-3 p-4 hover:bg-hover transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-fg-muted">{t.ticketNumber}</span>
                      <Badge variant={priorityVariant(t.priority)}>
                        {t.priority.charAt(0) + t.priority.slice(1).toLowerCase()}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-fg truncate">{t.subject}</p>
                    <p className="text-xs text-fg-muted">{t.customerName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={statusVariant(t.status)}>{statusLabel(t.status)}</Badge>
                    {t.assignedTo ? (
                      <UserAvatar
                        name={t.assignedTo.name || ""}
                        profileColor={t.assignedTo.profileColor || undefined}
                        profileEmoji={t.assignedTo.profileEmoji || undefined}
                        image={t.assignedTo.image || undefined}
                        size="sm"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-elevated border border-edge" />
                    )}
                    <span className="text-xs text-fg-dim">{formatDate(t.createdAt)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Priority Breakdown */}
          <div className="bg-card border border-edge rounded-xl p-5">
            <h2 className="font-semibold text-fg mb-4">Tickets by Priority</h2>
            <div className="space-y-3">
              {(
                [
                  { label: "Urgent", key: "URGENT", barClass: "bg-status-red" },
                  { label: "High", key: "HIGH", barClass: "bg-status-amber" },
                  { label: "Medium", key: "MEDIUM", barClass: "bg-status-blue" },
                  { label: "Low", key: "LOW", barClass: "bg-elevated border border-edge" },
                ] as const
              ).map(({ label, key, barClass }) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-fg-secondary">{label}</span>
                    <span className="text-fg font-medium">{priorityCounts[key]}</span>
                  </div>
                  <div className="h-2 bg-elevated rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barClass} rounded-full transition-all`}
                      style={{ width: `${(priorityCounts[key] / maxPriorityCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overdue Waiting */}
          <div className="bg-card border border-edge rounded-xl p-5">
            <h2 className="font-semibold text-fg mb-1">Overdue Waiting</h2>
            <p className="text-xs text-fg-muted mb-4">In WAITING status &gt; 48 hours</p>
            {overdueWaiting.length === 0 ? (
              <p className="text-sm text-fg-muted text-center py-2">No overdue tickets</p>
            ) : (
              <div className="space-y-2">
                {overdueWaiting.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tickets/${t.id}`}
                    className="block p-3 rounded-lg bg-elevated hover:bg-hover transition-colors border border-edge"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-fg-muted">{t.ticketNumber}</span>
                      <span className="text-xs text-status-amber-fg font-medium">{hoursAgo(t.updatedAt)}h ago</span>
                    </div>
                    <p className="text-sm text-fg truncate">{t.subject}</p>
                    <p className="text-xs text-fg-muted">{t.customerName}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
