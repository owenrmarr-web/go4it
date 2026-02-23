import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import ProjectDetail from "@/components/ProjectDetail";

export default async function ProjectPage({
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

  // Fetch project with related data
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { createdAt: "asc" } },
      labels: { orderBy: { name: "asc" } },
      statuses: { orderBy: { position: "asc" } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) notFound();

  // Fetch tasks
  const tasks = await prisma.task.findMany({
    where: { projectId: id },
    include: {
      subtasks: { orderBy: { position: "asc" } },
      labels: { include: { label: true } },
      assignee: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { position: "asc" },
  });

  const serializedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
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
    description: project.description,
    color: project.color,
    status: project.status,
    members: project.members.map((m) => ({
      id: m.id,
      role: m.role,
      userId: m.userId,
      user: m.user,
    })),
    milestones: project.milestones.map((ms) => ({
      id: ms.id,
      name: ms.name,
      description: ms.description,
      dueDate: ms.dueDate ? ms.dueDate.toISOString() : null,
      status: ms.status,
    })),
    labels: project.labels.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
    })),
    statuses: project.statuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      position: s.position,
    })),
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <ProjectDetail project={serializedProject} initialTasks={serializedTasks} />
    </div>
  );
}
