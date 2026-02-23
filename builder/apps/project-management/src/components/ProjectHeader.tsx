"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Member {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Milestone {
  id: string;
  name: string;
}

interface CustomStatus {
  name: string;
  color: string;
}

interface ProjectHeaderProps {
  projectId: string;
  projectName: string;
  projectColor: string;
  members: Member[];
  milestones: Milestone[];
  customStatuses: CustomStatus[];
  filters: {
    status: string;
    assigneeId: string;
    milestoneId: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onAddTask: () => void;
}

const viewTabs = [
  { label: "List", path: "" },
  { label: "Calendar", path: "/calendar" },
  { label: "Timeline", path: "/timeline" },
];

export default function ProjectHeader({
  projectId,
  projectName,
  projectColor,
  members,
  milestones,
  customStatuses,
  filters,
  onFilterChange,
  onAddTask,
}: ProjectHeaderProps) {
  const pathname = usePathname();
  const [showFilters, setShowFilters] = useState(false);

  const basePath = `/projects/${projectId}`;

  const getActiveTab = () => {
    if (pathname.endsWith("/calendar")) return "/calendar";
    if (pathname.endsWith("/timeline")) return "/timeline";
    return "";
  };

  const activeTab = getActiveTab();

  const defaultStatuses = [
    { name: "todo", label: "To Do" },
    { name: "in-progress", label: "In Progress" },
    { name: "done", label: "Done" },
  ];

  const allStatuses = [
    ...defaultStatuses,
    ...customStatuses.map((cs) => ({ name: cs.name.toLowerCase(), label: cs.name })),
  ];

  const hasActiveFilters = filters.status || filters.assigneeId || filters.milestoneId;

  return (
    <div className="mb-6">
      {/* Top row: project name + settings + add task */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: projectColor }}
          />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{projectName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddTask}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
          <Link
            href={`${basePath}/settings`}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Project settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* View tabs + filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* View tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {viewTabs.map((tab) => (
            <Link
              key={tab.path}
              href={`${basePath}${tab.path}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.path
                  ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            hasActiveFilters
              ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
          )}
        </button>
      </div>

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Status filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange("status", e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 text-sm px-2.5 py-1.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">All statuses</option>
              {allStatuses.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Assignee</label>
            <select
              value={filters.assigneeId}
              onChange={(e) => onFilterChange("assigneeId", e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 text-sm px-2.5 py-1.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">All members</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name || m.user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Milestone filter */}
          {milestones.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Milestone</label>
              <select
                value={filters.milestoneId}
                onChange={(e) => onFilterChange("milestoneId", e.target.value)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 text-sm px-2.5 py-1.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">All milestones</option>
                {milestones.map((ms) => (
                  <option key={ms.id} value={ms.id}>
                    {ms.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                onFilterChange("status", "");
                onFilterChange("assigneeId", "");
                onFilterChange("milestoneId", "");
              }}
              className="self-end px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
