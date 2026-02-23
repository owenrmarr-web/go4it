"use client";

interface CustomStatus {
  name: string;
  color: string;
}

interface StatusBadgeProps {
  status: string;
  customStatuses?: CustomStatus[];
}

const defaultColors: Record<string, { bg: string; text: string }> = {
  todo: { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-700 dark:text-gray-300" },
  "in-progress": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  in_progress: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  done: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
};

const defaultLabels: Record<string, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  in_progress: "In Progress",
  done: "Done",
};

export default function StatusBadge({ status, customStatuses }: StatusBadgeProps) {
  // Check custom statuses first
  const custom = customStatuses?.find(
    (cs) => cs.name.toLowerCase() === status.toLowerCase()
  );

  if (custom) {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
        style={{
          backgroundColor: `${custom.color}1a`,
          color: custom.color,
        }}
      >
        {custom.name}
      </span>
    );
  }

  const colors = defaultColors[status] || { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-700 dark:text-gray-300" };
  const label = defaultLabels[status] || status.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {label}
    </span>
  );
}
