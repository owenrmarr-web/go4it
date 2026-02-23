import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import WorkloadChart from "@/components/WorkloadChart";
import EmptyState from "@/components/EmptyState";

export default async function WorkloadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;

  // Get user's project IDs
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const projectIds = memberships.map((m) => m.projectId);

  // Get tasks with assignees across user's projects
  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      assigneeId: { not: null },
    },
    select: {
      status: true,
      assigneeId: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Build workload data grouped by assignee
  const workloadMap: Record<
    string,
    {
      user: { id: string; name: string | null; email: string };
      statusCounts: Record<string, number>;
      total: number;
    }
  > = {};

  for (const task of tasks) {
    if (!task.assigneeId || !task.assignee) continue;
    if (!workloadMap[task.assigneeId]) {
      workloadMap[task.assigneeId] = {
        user: task.assignee,
        statusCounts: {},
        total: 0,
      };
    }
    const entry = workloadMap[task.assigneeId];
    entry.statusCounts[task.status] = (entry.statusCounts[task.status] || 0) + 1;
    entry.total += 1;
  }

  const workloadData = Object.values(workloadMap).sort((a, b) => b.total - a.total);

  // Summary
  const totalAssigned = tasks.length;
  const totalMembers = workloadData.length;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workload</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Task distribution across team members in your projects.
        </p>
      </div>

      {workloadData.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
          title="No workload data"
          description="Assign tasks to team members in your projects to see workload distribution here."
          actionLabel="Go to Projects"
          actionHref="/projects"
        />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Team Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalMembers}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assigned Tasks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAssigned}</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Tasks per Team Member</h2>
            <WorkloadChart data={workloadData} />
          </div>
        </>
      )}
    </div>
  );
}
