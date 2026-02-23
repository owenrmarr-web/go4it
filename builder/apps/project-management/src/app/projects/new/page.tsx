import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import NewProjectForm from "@/components/NewProjectForm";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/projects" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
          Projects
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 dark:text-white font-medium">New Project</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Project</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Set up a new project to organize your team&apos;s work.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <NewProjectForm />
      </div>
    </div>
  );
}
