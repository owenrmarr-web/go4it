import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import ProjectSettings from "@/components/ProjectSettings";

export default async function SettingsPage({
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
      labels: { orderBy: { name: "asc" } },
      statuses: { orderBy: { position: "asc" } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      assignRules: true,
    },
  });

  if (!project) notFound();

  // Enrich assign rules with label and assignee info
  const enrichedRules = await Promise.all(
    project.assignRules.map(async (rule) => {
      const label = await prisma.label.findUnique({ where: { id: rule.labelId } });
      const assignee = await prisma.user.findUnique({
        where: { id: rule.assignToId },
        select: { id: true, name: true, email: true },
      });
      return {
        id: rule.id,
        labelId: rule.labelId,
        assignToId: rule.assignToId,
        label: label ? { id: label.id, name: label.name, color: label.color } : null,
        assignee: assignee,
      };
    })
  );

  const serializedProject = {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color,
    members: project.members.map((m) => ({
      id: m.id,
      role: m.role,
      userId: m.userId,
      user: m.user,
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
    rules: enrichedRules,
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <ProjectSettings
        project={serializedProject}
        currentUserRole={member.role}
        currentUserId={session.user.id}
      />
    </div>
  );
}
