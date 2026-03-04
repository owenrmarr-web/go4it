import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import DocumentStatusBadge from "@/components/DocumentStatusBadge";
import DocumentTypeBadge from "@/components/DocumentTypeBadge";
import { DocumentIcon, ClockIcon, BellIcon, CheckCircleIcon } from "@/components/Icons";

function StatCard({
  label,
  value,
  sublabel,
  icon,
}: {
  label: string;
  value: number;
  sublabel?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-edge rounded-xl p-5 flex items-center gap-4">
      <div className="bg-accent-soft rounded-lg p-3 text-accent-fg">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-fg">{value}</p>
        <p className="text-sm text-fg-secondary">{label}</p>
        {sublabel && <p className="text-xs text-fg-muted mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

function formatDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;
  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Auto-expire documents
  await prisma.document.updateMany({
    where: {
      userId,
      expiresAt: { lt: now },
      status: { in: ["APPROVED", "SIGNED"] },
    },
    data: { status: "EXPIRED" },
  });

  const [totalCount, inReviewCount, expiringSoonCount, recentlyUpdatedCount, recentDocs, expiringDocs, reviewQueue] =
    await Promise.all([
      prisma.document.count({ where: { userId } }),
      prisma.document.count({ where: { userId, status: "IN_REVIEW" } }),
      prisma.document.count({
        where: {
          userId,
          expiresAt: { gte: now, lte: thirtyDaysOut },
          status: { notIn: ["ARCHIVED", "EXPIRED"] },
        },
      }),
      prisma.document.count({ where: { userId, updatedAt: { gte: sevenDaysAgo } } }),
      prisma.document.findMany({
        where: { userId },
        include: {
          folder: { select: { name: true } },
          versions: {
            select: { versionNumber: true },
            orderBy: { versionNumber: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.document.findMany({
        where: {
          userId,
          expiresAt: { gte: now, lte: thirtyDaysOut },
          status: { notIn: ["ARCHIVED", "EXPIRED"] },
        },
        orderBy: { expiresAt: "asc" },
        take: 5,
      }),
      prisma.document.findMany({
        where: { userId, status: "IN_REVIEW" },
        include: { folder: { select: { name: true } } },
        orderBy: { updatedAt: "asc" },
        take: 5,
      }),
    ]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">Dashboard</h1>
        <p className="text-fg-muted text-sm mt-1">Welcome to GoDocs — your document management hub.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Documents"
          value={totalCount}
          icon={<DocumentIcon className="w-5 h-5" />}
        />
        <StatCard
          label="In Review"
          value={inReviewCount}
          sublabel="Awaiting approval"
          icon={<ClockIcon className="w-5 h-5" />}
        />
        <StatCard
          label="Expiring Soon"
          value={expiringSoonCount}
          sublabel="Within 30 days"
          icon={<BellIcon className="w-5 h-5" />}
        />
        <StatCard
          label="Recently Updated"
          value={recentlyUpdatedCount}
          sublabel="Last 7 days"
          icon={<CheckCircleIcon className="w-5 h-5" />}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="bg-card border border-edge rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
            <h2 className="font-semibold text-fg">Recent Documents</h2>
            <Link href="/documents" className="text-sm text-accent-fg hover:underline">
              View all
            </Link>
          </div>
          {recentDocs.length === 0 ? (
            <div className="px-5 py-8 text-center text-fg-muted text-sm">No documents yet</div>
          ) : (
            <div className="divide-y divide-edge">
              {recentDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-hover transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{doc.title}</p>
                    <p className="text-xs text-fg-muted">
                      {doc.folder?.name ?? "Unfiled"} · {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <DocumentTypeBadge type={doc.type} />
                    <DocumentStatusBadge status={doc.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Review Queue */}
        <div className="bg-card border border-edge rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-edge">
            <h2 className="font-semibold text-fg">Review Queue</h2>
            <p className="text-xs text-fg-muted mt-0.5">Documents awaiting approval</p>
          </div>
          {reviewQueue.length === 0 ? (
            <div className="px-5 py-8 text-center text-fg-muted text-sm">No documents in review</div>
          ) : (
            <div className="divide-y divide-edge">
              {reviewQueue.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-hover transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{doc.title}</p>
                    <p className="text-xs text-fg-muted">
                      {doc.folder?.name ?? "Unfiled"} · Updated {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                  <DocumentTypeBadge type={doc.type} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Expiring Soon */}
        {expiringDocs.length > 0 && (
          <div className="bg-card border border-edge rounded-xl overflow-hidden lg:col-span-2">
            <div className="px-5 py-4 border-b border-edge">
              <h2 className="font-semibold text-fg">Expiring Soon</h2>
              <p className="text-xs text-fg-muted mt-0.5">
                Documents expiring within the next 30 days
              </p>
            </div>
            <div className="divide-y divide-edge">
              {expiringDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-hover transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{doc.title}</p>
                    <p className="text-xs text-fg-muted">{doc.clientName ?? "No client"}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <DocumentStatusBadge status={doc.status} />
                    <span className="text-xs font-medium text-status-red-fg bg-status-red px-2 py-0.5 rounded-full">
                      Expires {formatDate(doc.expiresAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
