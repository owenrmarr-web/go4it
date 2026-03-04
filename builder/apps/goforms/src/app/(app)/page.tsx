import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import Badge from "@/components/Badge";
import { DocumentIcon, InboxIcon, CheckCircleIcon, BellIcon, ChartBarIcon } from "@/components/Icons";

function StatCard({
  label,
  value,
  icon,
  href,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href?: string;
  accent?: "green" | "red" | "blue" | "default";
}) {
  const accentMap: Record<string, string> = {
    green: "text-status-green-fg",
    red: "text-status-red-fg",
    blue: "text-accent-fg",
    default: "text-fg",
  };
  const content = (
    <div className="bg-card border border-edge rounded-xl p-5 hover:border-edge-strong transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-fg-muted text-sm font-medium">{label}</span>
        <span className="text-fg-muted">{icon}</span>
      </div>
      <div className={`text-3xl font-bold ${accentMap[accent ?? "default"]}`}>{value}</div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [activeForms, thisMonthCount, todayCount, flaggedCount, recentSubs, activeFormsList, flaggedSubs] =
    await Promise.all([
      prisma.form.count({ where: { userId, status: "ACTIVE" } }),
      prisma.submission.count({ where: { userId, createdAt: { gte: startOfMonth } } }),
      prisma.submission.count({ where: { userId, createdAt: { gte: startOfDay } } }),
      prisma.submission.count({ where: { userId, status: "FLAGGED" } }),
      prisma.submission.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { form: { select: { title: true } } },
      }),
      prisma.form.findMany({
        where: { userId, status: "ACTIVE" },
        orderBy: { submissionCount: "desc" },
        take: 5,
        include: {
          _count: { select: { submissions: true } },
        },
      }),
      prisma.submission.findMany({
        where: { userId, status: "FLAGGED" },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { form: { select: { title: true } } },
      }),
    ]);

  const lastSubDates = await Promise.all(
    activeFormsList.map((f) =>
      prisma.submission.findFirst({
        where: { formId: f.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      })
    )
  );

  const statusBadge = (status: string) => {
    const map: Record<string, "success" | "info" | "error"> = {
      COMPLETE: "success",
      REVIEWED: "info",
      FLAGGED: "error",
    };
    const label: Record<string, string> = { COMPLETE: "Complete", REVIEWED: "Reviewed", FLAGGED: "Flagged" };
    return <Badge variant={map[status] ?? "neutral"}>{label[status] ?? status}</Badge>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">Dashboard</h1>
        <p className="text-fg-muted text-sm mt-1">Overview of your forms and responses</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Forms" value={activeForms} icon={<DocumentIcon />} href="/forms" accent="blue" />
        <StatCard label="Submissions This Month" value={thisMonthCount} icon={<InboxIcon />} href="/submissions" />
        <StatCard label="Today" value={todayCount} icon={<CheckCircleIcon />} href="/submissions" accent="green" />
        <StatCard label="Flagged for Review" value={flaggedCount} icon={<BellIcon />} href="/submissions?status=FLAGGED" accent="red" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Submissions */}
        <div className="bg-card border border-edge rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-fg">Recent Submissions</h2>
            <Link href="/submissions" className="text-sm text-accent-fg hover:underline">View all</Link>
          </div>
          {recentSubs.length === 0 ? (
            <p className="text-fg-muted text-sm py-4 text-center">No submissions yet</p>
          ) : (
            <div className="space-y-3">
              {recentSubs.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/submissions/${sub.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-elevated hover:bg-hover transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">
                      {sub.respondentName || "Anonymous"}
                    </p>
                    <p className="text-xs text-fg-muted truncate">{sub.form.title}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    {statusBadge(sub.status)}
                    <span className="text-xs text-fg-muted">
                      {sub.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Active Forms Performance */}
        <div className="bg-card border border-edge rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-fg">Active Forms</h2>
            <Link href="/forms" className="text-sm text-accent-fg hover:underline">View all</Link>
          </div>
          {activeFormsList.length === 0 ? (
            <p className="text-fg-muted text-sm py-4 text-center">No active forms</p>
          ) : (
            <div className="space-y-3">
              {activeFormsList.map((form, i) => (
                <Link
                  key={form.id}
                  href={`/forms/${form.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-elevated hover:bg-hover transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
                      <ChartBarIcon />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{form.title}</p>
                      <p className="text-xs text-fg-muted">
                        {lastSubDates[i]?.createdAt
                          ? `Last: ${lastSubDates[i]!.createdAt.toLocaleDateString()}`
                          : "No submissions yet"}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-fg ml-3 shrink-0">{form.submissionCount}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Needs Review */}
      {flaggedSubs.length > 0 && (
        <div className="bg-card border border-edge rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-fg flex items-center gap-2">
              <span className="text-status-red-fg"><BellIcon /></span>
              Needs Review
            </h2>
            <Link href="/submissions?status=FLAGGED" className="text-sm text-accent-fg hover:underline">
              View all flagged
            </Link>
          </div>
          <div className="space-y-3">
            {flaggedSubs.map((sub) => (
              <Link
                key={sub.id}
                href={`/submissions/${sub.id}`}
                className="flex items-start justify-between p-3 rounded-lg bg-elevated border border-edge hover:border-edge-strong transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-fg">
                      {sub.respondentName || "Anonymous"}
                    </p>
                    <Badge variant="error">Flagged</Badge>
                  </div>
                  <p className="text-xs text-fg-muted mt-0.5">{sub.form.title}</p>
                  {sub.notes && (
                    <p className="text-xs text-fg-secondary mt-1 truncate">{sub.notes}</p>
                  )}
                </div>
                <span className="text-xs text-fg-muted ml-4 shrink-0">
                  {sub.createdAt.toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
