import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import Badge from "@/components/Badge";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;

  const [
    totalActiveSubscribers,
    campaignsSentThisMonth,
    sentCampaigns,
    totalLists,
    recentCampaigns,
    lists,
    scheduledCampaigns,
  ] = await Promise.all([
    prisma.subscriber.count({
      where: { userId, status: "ACTIVE" },
    }),
    prisma.campaign.count({
      where: {
        userId,
        status: "SENT",
        sentAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.campaign.findMany({
      where: { userId, status: "SENT" },
      select: { openCount: true, recipientCount: true },
    }),
    prisma.contactList.count({ where: { userId } }),
    prisma.campaign.findMany({
      where: { userId },
      include: { list: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.contactList.findMany({
      where: { userId },
      include: {
        subscribers: {
          select: { status: true },
        },
      },
    }),
    prisma.campaign.findMany({
      where: { userId, status: "SCHEDULED" },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const avgOpenRate =
    sentCampaigns.length > 0
      ? sentCampaigns.reduce((acc, c) => {
          return acc + (c.recipientCount > 0 ? c.openCount / c.recipientCount : 0);
        }, 0) / sentCampaigns.length
      : 0;

  const statusBadge = (status: string) => {
    const variants: Record<string, "success" | "info" | "warning" | "error" | "neutral"> = {
      SENT: "success",
      SCHEDULED: "info",
      SENDING: "warning",
      DRAFT: "neutral",
      CANCELLED: "error",
    };
    return <Badge variant={variants[status] || "neutral"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-fg">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-edge p-5">
          <p className="text-sm text-fg-muted">Total Subscribers</p>
          <p className="text-3xl font-bold text-fg mt-1">{totalActiveSubscribers}</p>
          <p className="text-xs text-fg-dim mt-1">Active across all lists</p>
        </div>
        <div className="bg-card rounded-xl border border-edge p-5">
          <p className="text-sm text-fg-muted">Campaigns Sent</p>
          <p className="text-3xl font-bold text-fg mt-1">{campaignsSentThisMonth}</p>
          <p className="text-xs text-fg-dim mt-1">This month</p>
        </div>
        <div className="bg-card rounded-xl border border-edge p-5">
          <p className="text-sm text-fg-muted">Avg Open Rate</p>
          <p className="text-3xl font-bold text-fg mt-1">
            {(avgOpenRate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-fg-dim mt-1">Across sent campaigns</p>
        </div>
        <div className="bg-card rounded-xl border border-edge p-5">
          <p className="text-sm text-fg-muted">Total Lists</p>
          <p className="text-3xl font-bold text-fg mt-1">{totalLists}</p>
          <p className="text-xs text-fg-dim mt-1">Contact lists</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <div className="bg-card rounded-xl border border-edge p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-fg">Recent Campaigns</h2>
            <Link href="/campaigns" className="text-sm text-accent-fg hover:underline">
              View all
            </Link>
          </div>
          {recentCampaigns.length === 0 ? (
            <p className="text-fg-muted text-sm">No campaigns yet.</p>
          ) : (
            <div className="space-y-3">
              {recentCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-elevated hover:bg-hover transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg truncate">{campaign.name}</p>
                    <p className="text-xs text-fg-muted mt-0.5">
                      {campaign.list.name} &middot;{" "}
                      {campaign.sentAt
                        ? new Date(campaign.sentAt).toLocaleDateString()
                        : campaign.scheduledAt
                        ? `Scheduled: ${new Date(campaign.scheduledAt).toLocaleDateString()}`
                        : "Draft"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    {campaign.status === "SENT" && campaign.recipientCount > 0 && (
                      <span className="text-xs text-fg-muted">
                        {((campaign.openCount / campaign.recipientCount) * 100).toFixed(0)}% open
                      </span>
                    )}
                    {statusBadge(campaign.status)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* List Growth */}
        <div className="bg-card rounded-xl border border-edge p-5">
          <h2 className="text-lg font-semibold text-fg mb-4">List Overview</h2>
          {lists.length === 0 ? (
            <p className="text-fg-muted text-sm">No lists yet.</p>
          ) : (
            <div className="space-y-3">
              {lists.map((list) => {
                const active = list.subscribers.filter((s) => s.status === "ACTIVE").length;
                const unsub = list.subscribers.filter((s) => s.status === "UNSUBSCRIBED").length;
                const total = list.subscribers.length;
                return (
                  <Link
                    key={list.id}
                    href={`/lists/${list.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-elevated hover:bg-hover transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: list.color }}
                      />
                      <div>
                        <p className="text-sm font-medium text-fg">{list.name}</p>
                        <p className="text-xs text-fg-muted mt-0.5">
                          {active} active &middot; {unsub} unsubscribed &middot; {total} total
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Scheduled */}
      {scheduledCampaigns.length > 0 && (
        <div className="bg-card rounded-xl border border-edge p-5">
          <h2 className="text-lg font-semibold text-fg mb-4">Upcoming Scheduled</h2>
          <div className="space-y-3">
            {scheduledCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-elevated hover:bg-hover transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-fg">{campaign.name}</p>
                  <p className="text-xs text-fg-muted mt-0.5">{campaign.subject}</p>
                </div>
                <div className="text-right">
                  <Badge variant="info">SCHEDULED</Badge>
                  <p className="text-xs text-fg-muted mt-1">
                    {campaign.scheduledAt
                      ? new Date(campaign.scheduledAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
