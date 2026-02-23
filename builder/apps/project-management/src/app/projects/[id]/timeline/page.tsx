import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import TimelinePageClient from "./TimelinePageClient";

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  // Verify project membership
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId: session.user.id } },
  });
  if (!member) notFound();

  // Fetch project metadata
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { createdAt: "asc" } },
      statuses: { orderBy: { position: "asc" } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) notFound();

  // Fetch tasks with dates and milestones
  const tasks = await prisma.task.findMany({
    where: { projectId: id },
    include: {
      labels: { include: { label: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { position: "asc" },
  });

  const serializedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    estimate: t.estimate,
    position: t.position,
    createdAt: t.createdAt.toISOString(),
    assignee: t.assignee,
    labels: t.labels,
    milestoneId: t.milestoneId,
  }));

  const serializedProject = {
    id: project.id,
    name: project.name,
    color: project.color,
    members: project.members.map((m) => ({
      id: m.id,
      role: m.role,
      userId: m.userId,
      user: m.user,
    })),
    milestones: project.milestones.map((ms) => ({
      id: ms.id,
      name: ms.name,
    })),
    statuses: project.statuses.map((s) => ({
      name: s.name,
      color: s.color,
    })),
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <TimelinePageClient project={serializedProject} initialTasks={serializedTasks} />
    </div>
  );
}
