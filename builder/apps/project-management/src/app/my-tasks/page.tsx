import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import MyTasksList from "@/components/MyTasksList";
import EmptyState from "@/components/EmptyState";

export default async function MyTasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;

  const tasks = await prisma.task.findMany({
    where: { assigneeId: userId },
    include: {
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: [
      { dueDate: "asc" },
      { position: "asc" },
    ],
  });

  // Serialize dates for the client component
  const serializedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    projectId: t.projectId,
    project: t.project,
  }));

  // Compute summary stats
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length;
  const overdueTasks = tasks.filter(
    (t) => t.status !== "done" && t.dueDate && t.dueDate < new Date()
  ).length;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Tasks assigned to you across all projects.
        </p>
      </div>

      {/* Summary stats */}
      {totalTasks > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTasks}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{inProgressTasks}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">{doneTasks}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overdue</p>
            <p className={`text-2xl font-bold ${overdueTasks > 0 ? "text-red-600" : "text-gray-900 dark:text-white"}`}>
              {overdueTasks}
            </p>
          </div>
        </div>
      )}

      {/* Task list or empty state */}
      {totalTasks === 0 ? (
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
          title="No tasks assigned"
          description="You don't have any tasks assigned to you yet. Tasks will appear here once a project member assigns them to you."
          actionLabel="Browse Projects"
          actionHref="/projects"
        />
      ) : (
        <MyTasksList tasks={serializedTasks} />
      )}
    </div>
  );
}
