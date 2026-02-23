import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import MasterCalendarView from "@/components/MasterCalendarView";

export default async function MasterCalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;

  // Get user's projects
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const projectIds = memberships.map((m) => m.projectId);

  // Fetch projects and tasks in parallel
  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { projectId: { in: projectIds }, dueDate: { not: null } },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        projectId: true,
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const serializedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    projectId: t.projectId,
    project: t.project,
  }));

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          All tasks across your projects in one view.
        </p>
      </div>

      <MasterCalendarView tasks={serializedTasks} projects={projects} />
    </div>
  );
}
