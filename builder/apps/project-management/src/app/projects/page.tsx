import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import ProjectCard from "@/components/ProjectCard";
import EmptyState from "@/components/EmptyState";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;

  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      _count: { select: { members: true, tasks: true } },
      tasks: {
        where: { status: "done" },
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="px-4 py-2.5 gradient-brand text-white font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Project grid or empty state */}
      {projects.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          }
          title="No projects yet"
          description="Create your first project to start organizing tasks and collaborating with your team."
          actionLabel="Create Project"
          actionHref="/projects/new"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              description={project.description}
              color={project.color}
              taskCount={project._count.tasks}
              memberCount={project._count.members}
              completedTaskCount={project.tasks.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}
