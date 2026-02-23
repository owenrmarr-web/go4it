"use client";

import Link from "next/link";

interface ProjectCardProps {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  taskCount: number;
  memberCount: number;
  completedTaskCount: number;
}

export default function ProjectCard({
  id,
  name,
  description,
  color,
  taskCount,
  memberCount,
  completedTaskCount,
}: ProjectCardProps) {
  const completionPct = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

  return (
    <Link href={`/projects/${id}`} className="block group">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {/* Color accent bar */}
        <div className="h-1.5" style={{ backgroundColor: color }} />

        <div className="p-5">
          {/* Project name */}
          <div className="flex items-center gap-2.5 mb-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
              {name}
            </h3>
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">{description}</p>
          )}
          {!description && <div className="mb-4" />}

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>{completionPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${completionPct}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <span>
                {completedTaskCount}/{taskCount} tasks
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{memberCount} members</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
