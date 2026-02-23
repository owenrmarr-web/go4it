import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // First get the user's project IDs (needed for activity query)
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const projectIds = memberships.map((m) => m.projectId);

  // Fetch stats, activity, deadlines, and projects in parallel
  const [
    totalTasks,
    myTasks,
    recentActivity,
    upcomingDeadlines,
    userProjects,
  ] = await Promise.all([
    prisma.task.count({
      where: { project: { members: { some: { userId } } } },
    }),
    prisma.task.count({ where: { assigneeId: userId } }),
    prisma.activity.findMany({
      where: {
        OR: [
          { projectId: { in: projectIds } },
          { userId },
        ],
      },
      include: {
        user: { select: { name: true } },
        task: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { not: "done" },
        dueDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.project.findMany({
      where: {
        members: { some: { userId } },
      },
      select: {
        id: true,
        name: true,
        color: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const projectCount = projectIds.length;

  const myTasksByStatus = await prisma.task.groupBy({
    by: ["status"],
    where: { assigneeId: userId },
    _count: { id: true },
  });

  const statusMap: Record<string, number> = {};
  for (const s of myTasksByStatus) {
    statusMap[s.status] = s._count.id;
  }

  const stats = [
    { label: "Projects", value: projectCount, color: "bg-blue-500" },
    { label: "Total Tasks", value: totalTasks, color: "bg-purple-500" },
    { label: "My Tasks", value: myTasks, color: "bg-orange-500" },
    { label: "In Progress", value: statusMap["in-progress"] || 0, color: "bg-green-500" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {session.user.name || "there"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here is an overview of your projects and tasks.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${stat.color}`} />
              <span className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Two-column layout: Upcoming Deadlines + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Upcoming Deadlines */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Deadlines</h2>
            <Link href="/my-tasks" className="text-xs text-purple-600 hover:underline font-medium">
              View all
            </Link>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-4">No tasks due in the next 7 days.</p>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((task) => {
                const daysUntil = Math.ceil(
                  (new Date(task.dueDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );
                const urgencyColor =
                  daysUntil <= 1 ? "text-red-600" : daysUntil <= 3 ? "text-orange-600" : "text-gray-500";

                return (
                  <Link
                    key={task.id}
                    href={`/projects/${task.projectId}/tasks/${task.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors -mx-1"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: task.project.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400 truncate">{task.project.name}</p>
                    </div>
                    <span className={`text-xs font-medium flex-shrink-0 ${urgencyColor}`}>
                      {daysUntil === 0
                        ? "Today"
                        : daysUntil === 1
                          ? "Tomorrow"
                          : `${daysUntil} days`}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links: Projects */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Projects</h2>
            <Link href="/projects" className="text-xs text-purple-600 hover:underline font-medium">
              View all
            </Link>
          </div>
          {userProjects.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">No projects yet.</p>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 gradient-brand text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Project
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {userProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors -mx-1"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 truncate">
                    {project.name}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {project._count.tasks} tasks
                  </span>
                </Link>
              ))}
              <Link
                href="/projects/new"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors -mx-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No recent activity. Create a project to get started!</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-purple-700">
                    {(activity.user.name || "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-gray-100">
                    <span className="font-medium">{activity.user.name}</span>{" "}
                    <span className="text-gray-500 dark:text-gray-400">{activity.detail || activity.type}</span>
                  </p>
                  {activity.task && (
                    <p className="text-gray-400 text-xs mt-0.5 truncate">{activity.task.title}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-0.5">
                    {new Date(activity.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
