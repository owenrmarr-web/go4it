import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import Badge from "@/components/Badge";
import UserAvatar from "@/components/UserAvatar";
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  DocumentIcon,
  CheckCircleIcon,
  UserIcon,
  BuildingIcon,
  CurrencyIcon,
} from "@/components/Icons";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatEmploymentType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusBadgeVariant(status: string): "success" | "warning" | "error" {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
      return "success";
    case "ON_LEAVE":
    case "PENDING":
      return "warning";
    case "TERMINATED":
    case "DENIED":
    case "FLAGGED":
      return "error";
    default:
      return "warning";
  }
}

function getDocumentTypeVariant(type: string): "info" | "neutral" | "warning" | "success" {
  switch (type) {
    case "OFFER_LETTER":
    case "CONTRACT":
      return "info";
    case "ID_DOCUMENT":
    case "TAX_FORM":
    case "OTHER":
      return "neutral";
    case "POLICY":
      return "warning";
    case "CERTIFICATION":
      return "success";
    default:
      return "neutral";
  }
}

function formatDocumentType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimeOffType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function DirectoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;
  const uid = session.user.id;

  const profile = await prisma.employeeProfile.findFirst({
    where: { id, userId: uid },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
          profileColor: true,
          profileEmoji: true,
        },
      },
      department: true,
      timeOffRequests: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      timeEntries: {
        orderBy: { date: "desc" },
        take: 14,
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
      onboardingAssignments: {
        include: {
          checklist: {
            include: {
              items: {
                orderBy: { order: "asc" },
              },
            },
          },
          itemCompletions: true,
        },
      },
    },
  });

  if (!profile) redirect("/directory");

  // Fetch manager name if managerId is set
  let managerName: string | null = null;
  if (profile.managerId) {
    const manager = await prisma.employeeProfile.findFirst({
      where: { id: profile.managerId, userId: uid },
      include: {
        user: { select: { name: true } },
      },
    });
    managerName = manager?.user?.name ?? null;
  }

  const employeeName = profile.user?.name ?? "Unknown Employee";
  const employeeEmail = profile.user?.email ?? "";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/directory"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to Directory
      </Link>

      {/* Profile Card */}
      <div className="bg-card rounded-xl border border-edge p-5">
        <div className="flex items-start gap-4">
          <UserAvatar
            name={employeeName}
            image={profile.user?.image}
            profileColor={profile.user?.profileColor}
            profileEmoji={profile.user?.profileEmoji}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-fg">{employeeName}</h1>
                <p className="text-sm text-fg-secondary mt-0.5">{profile.jobTitle}</p>
              </div>
              <Badge variant={getStatusBadgeVariant(profile.status)}>
                {profile.status.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-fg-muted">
              {profile.department && (
                <span className="inline-flex items-center gap-1.5">
                  <BuildingIcon className="w-4 h-4" />
                  <Badge variant="accent">
                    <span
                      className="w-2 h-2 rounded-full inline-block mr-1.5"
                      style={{ backgroundColor: profile.department.color }}
                    />
                    {profile.department.name}
                  </Badge>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <UserIcon className="w-4 h-4" />
                ID: {profile.employeeId}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <EnvelopeIcon className="w-4 h-4" />
                {employeeEmail}
              </span>
              {profile.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <PhoneIcon className="w-4 h-4" />
                  {profile.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Employment Details */}
      <div className="bg-card rounded-xl border border-edge p-5">
        <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
          <BriefcaseIcon className="w-5 h-5 text-fg-muted" />
          Employment Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-fg-muted uppercase tracking-wide">Employment Type</p>
            <p className="text-sm text-fg font-medium mt-1">
              {formatEmploymentType(profile.employmentType)}
            </p>
          </div>
          {profile.hourlyRate != null && (
            <div>
              <p className="text-xs text-fg-muted uppercase tracking-wide">Hourly Rate</p>
              <p className="text-sm text-fg font-medium mt-1">
                {formatCurrency(profile.hourlyRate)}
              </p>
            </div>
          )}
          {profile.salary != null && (
            <div>
              <p className="text-xs text-fg-muted uppercase tracking-wide">Salary</p>
              <p className="text-sm text-fg font-medium mt-1">
                {formatCurrency(profile.salary)}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-fg-muted uppercase tracking-wide">Hire Date</p>
            <p className="text-sm text-fg font-medium mt-1">
              {formatDate(profile.hireDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-fg-muted uppercase tracking-wide">Status</p>
            <div className="mt-1">
              <Badge variant={getStatusBadgeVariant(profile.status)}>
                {profile.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
          {managerName && (
            <div>
              <p className="text-xs text-fg-muted uppercase tracking-wide">Manager</p>
              <p className="text-sm text-fg font-medium mt-1">{managerName}</p>
            </div>
          )}
          {profile.terminatedDate && (
            <div>
              <p className="text-xs text-fg-muted uppercase tracking-wide">Terminated Date</p>
              <p className="text-sm text-fg font-medium mt-1">
                {formatDate(profile.terminatedDate)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-card rounded-xl border border-edge p-5">
        <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
          <MapPinIcon className="w-5 h-5 text-fg-muted" />
          Contact Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.address && (
            <div>
              <p className="text-xs text-fg-muted uppercase tracking-wide">Address</p>
              <p className="text-sm text-fg font-medium mt-1">{profile.address}</p>
            </div>
          )}
          {profile.city && (
            <div>
              <p className="text-xs text-fg-muted uppercase tracking-wide">City</p>
              <p className="text-sm text-fg font-medium mt-1">{profile.city}</p>
            </div>
          )}
          {profile.state && (
            <div>
              <p className="text-xs text-fg-muted uppercase tracking-wide">State</p>
              <p className="text-sm text-fg font-medium mt-1">{profile.state}</p>
            </div>
          )}
          {profile.zip && (
            <div>
              <p className="text-xs text-fg-muted uppercase tracking-wide">Zip Code</p>
              <p className="text-sm text-fg font-medium mt-1">{profile.zip}</p>
            </div>
          )}
          {profile.emergencyContact && (
            <div className="sm:col-span-2">
              <p className="text-xs text-fg-muted uppercase tracking-wide">Emergency Contact</p>
              <p className="text-sm text-fg font-medium mt-1">{profile.emergencyContact}</p>
            </div>
          )}
          {!profile.address && !profile.city && !profile.state && !profile.zip && !profile.emergencyContact && (
            <p className="text-sm text-fg-muted col-span-full">No contact information on file.</p>
          )}
        </div>
      </div>

      {/* Time-Off Summary */}
      <div className="bg-card rounded-xl border border-edge p-5">
        <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-fg-muted" />
          Time-Off Requests
        </h2>
        {profile.timeOffRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge text-left">
                  <th className="pb-2 text-xs text-fg-muted uppercase tracking-wide font-medium">Type</th>
                  <th className="pb-2 text-xs text-fg-muted uppercase tracking-wide font-medium">Start</th>
                  <th className="pb-2 text-xs text-fg-muted uppercase tracking-wide font-medium">End</th>
                  <th className="pb-2 text-xs text-fg-muted uppercase tracking-wide font-medium">Days</th>
                  <th className="pb-2 text-xs text-fg-muted uppercase tracking-wide font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {profile.timeOffRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="py-2.5 pr-3">
                      <Badge variant="info">{formatTimeOffType(request.type)}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-fg">{formatDate(request.startDate)}</td>
                    <td className="py-2.5 pr-3 text-fg">{formatDate(request.endDate)}</td>
                    <td className="py-2.5 pr-3 text-fg">{request.totalDays}</td>
                    <td className="py-2.5">
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {request.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">No time-off requests on file.</p>
        )}
      </div>

      {/* Recent Time Entries */}
      <div className="bg-card rounded-xl border border-edge p-5">
        <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-fg-muted" />
          Recent Time Entries
        </h2>
        {profile.timeEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge text-left">
                  <th className="pb-2 text-xs text-fg-muted uppercase tracking-wide font-medium">Date</th>
                  <th className="pb-2 text-xs text-fg-muted uppercase tracking-wide font-medium">Clock In</th>
                  <th className="pb-2 text-xs text-fg-muted uppercase tracking-wide font-medium">Clock Out</th>
                  <th className="pb-2 text-xs text-fg-muted uppercase tracking-wide font-medium">Hours</th>
                  <th className="pb-2 text-xs text-fg-muted uppercase tracking-wide font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {profile.timeEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2.5 pr-3 text-fg">{formatDate(entry.date)}</td>
                    <td className="py-2.5 pr-3 text-fg">{formatTime(entry.clockIn)}</td>
                    <td className="py-2.5 pr-3 text-fg">
                      {entry.clockOut ? formatTime(entry.clockOut) : <span className="text-fg-muted">--</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-fg">
                      {entry.totalHours != null ? entry.totalHours.toFixed(2) : <span className="text-fg-muted">--</span>}
                    </td>
                    <td className="py-2.5">
                      <Badge variant={getStatusBadgeVariant(entry.status)}>
                        {entry.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">No time entries recorded.</p>
        )}
      </div>

      {/* Documents */}
      <div className="bg-card rounded-xl border border-edge p-5">
        <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
          <DocumentIcon className="w-5 h-5 text-fg-muted" />
          Documents
        </h2>
        {profile.documents.length > 0 ? (
          <div className="space-y-3">
            {profile.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-elevated border border-edge"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <DocumentIcon className="w-5 h-5 text-fg-muted flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{doc.title}</p>
                    {doc.description && (
                      <p className="text-xs text-fg-muted truncate mt-0.5">{doc.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={getDocumentTypeVariant(doc.type)}>
                    {formatDocumentType(doc.type)}
                  </Badge>
                  {doc.expiresAt && (
                    <span className="text-xs text-fg-muted">
                      Exp: {formatDate(doc.expiresAt)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">No documents on file.</p>
        )}
      </div>

      {/* Onboarding Progress */}
      {profile.onboardingAssignments.length > 0 && (
        <div className="bg-card rounded-xl border border-edge p-5">
          <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-fg-muted" />
            Onboarding Progress
          </h2>
          <div className="space-y-5">
            {profile.onboardingAssignments.map((assignment) => {
              const totalItems = assignment.checklist.items.length;
              const completedItemIds = new Set(
                assignment.itemCompletions.map((c) => c.itemId)
              );
              const completedCount = assignment.checklist.items.filter((item) =>
                completedItemIds.has(item.id)
              ).length;
              const percentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

              return (
                <div key={assignment.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-fg">
                      {assignment.checklist.title}
                    </h3>
                    <span className="text-xs text-fg-muted">
                      {completedCount}/{totalItems} completed ({percentage}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-elevated mb-3">
                    <div
                      className="h-2 rounded-full bg-accent transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Checklist items */}
                  <div className="space-y-1.5">
                    {assignment.checklist.items.map((item) => {
                      const isCompleted = completedItemIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2.5 py-1"
                        >
                          <div
                            className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                              isCompleted
                                ? "bg-accent border-accent text-white"
                                : "border-edge-strong bg-page"
                            }`}
                          >
                            {isCompleted && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                                className="w-3 h-3"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-sm ${
                              isCompleted ? "text-fg-muted line-through" : "text-fg"
                            }`}
                          >
                            {item.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {assignment.completedAt && (
                    <p className="text-xs text-fg-muted mt-2">
                      Completed on {formatDate(assignment.completedAt)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
