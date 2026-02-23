"use client";

import { useState } from "react";
import Link from "next/link";
import MemberManager from "@/components/MemberManager";
import LabelManager from "@/components/LabelManager";
import StatusManager from "@/components/StatusManager";
import RuleManager from "@/components/RuleManager";

interface Member {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface CustomStatus {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface AssignRule {
  id: string;
  labelId: string;
  assignToId: string;
  label: { id: string; name: string; color: string } | null;
  assignee: { id: string; name: string | null; email: string } | null;
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  members: Member[];
  labels: Label[];
  statuses: CustomStatus[];
  rules: AssignRule[];
}

interface ProjectSettingsProps {
  project: ProjectData;
  currentUserRole: string;
  currentUserId: string;
}

const tabs = [
  { key: "members", label: "Members" },
  { key: "labels", label: "Labels" },
  { key: "statuses", label: "Statuses" },
  { key: "rules", label: "Rules" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function ProjectSettings({
  project,
  currentUserRole,
  currentUserId,
}: ProjectSettingsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("members");

  const canEdit = ["owner", "admin"].includes(currentUserRole);

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/export?projectId=${project.id}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-tasks.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Export failed silently
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${project.id}`}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Back to project"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Project Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{project.name}</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {activeTab === "members" && (
          <MemberManager
            projectId={project.id}
            initialMembers={project.members}
            canEdit={canEdit}
            currentUserId={currentUserId}
          />
        )}
        {activeTab === "labels" && (
          <LabelManager
            projectId={project.id}
            initialLabels={project.labels}
            canEdit={canEdit}
          />
        )}
        {activeTab === "statuses" && (
          <StatusManager
            projectId={project.id}
            initialStatuses={project.statuses}
            canEdit={canEdit}
          />
        )}
        {activeTab === "rules" && (
          <RuleManager
            projectId={project.id}
            initialRules={project.rules}
            members={project.members}
            labels={project.labels}
            canEdit={canEdit}
          />
        )}
      </div>
    </div>
  );
}
