import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import TaskDetail from "@/components/TaskDetail";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id, taskId } = await params;

  // Verify project membership
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId: session.user.id } },
  });
  if (!member) notFound();

  // Fetch full task with ALL relations
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      subtasks: { orderBy: { position: "asc" } },
      comments: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      attachments: { orderBy: { createdAt: "desc" } },
      watchers: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      activities: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      labels: { include: { label: true } },
      assignee: { select: { id: true, name: true, email: true } },
      user: { select: { id: true, name: true, email: true } },
      milestone: true,
    },
  });

  if (!task || task.projectId !== id) notFound();

  // Fetch project members, labels, and milestones in parallel
  const [members, projectLabels, projectMilestones] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.label.findMany({
      where: { projectId: id },
      orderBy: { name: "asc" },
    }),
    prisma.milestone.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Serialize dates for client component (JSON serialization)
  const serializedTask = JSON.parse(JSON.stringify(task));
  const serializedMembers = JSON.parse(JSON.stringify(members));
  const serializedLabels = JSON.parse(JSON.stringify(projectLabels));
  const serializedMilestones = JSON.parse(JSON.stringify(projectMilestones));

  return (
    <TaskDetail
      task={serializedTask}
      projectId={id}
      currentUserId={session.user.id}
      members={serializedMembers}
      labels={serializedLabels}
      milestones={serializedMilestones}
    />
  );
}
