"use client";

import UserAvatar from "@/components/UserAvatar";

interface WorkloadEntry {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  statusCounts: Record<string, number>;
  total: number;
}

interface WorkloadChartProps {
  data: WorkloadEntry[];
}

const statusColors: Record<string, { bg: string; label: string }> = {
  done: { bg: "#22c55e", label: "Done" },
  "in-progress": { bg: "#3b82f6", label: "In Progress" },
  todo: { bg: "#d1d5db", label: "To Do" },
};

const statusOrder = ["done", "in-progress", "todo"];

export default function WorkloadChart({ data }: WorkloadChartProps) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-6">
        {statusOrder.map((status) => {
          const config = statusColors[status];
          return (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: config.bg }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* Bars */}
      <div className="space-y-4">
        {data.map((entry) => {
          const name = entry.user.name || entry.user.email;
          return (
            <div key={entry.user.id} className="flex items-center gap-3">
              {/* User info */}
              <div className="flex items-center gap-2.5 w-40 flex-shrink-0">
                <UserAvatar name={name} size="sm" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {name}
                </span>
              </div>

              {/* Stacked bar */}
              <div className="flex-1 flex items-center gap-1">
                <div
                  className="flex h-7 rounded-md overflow-hidden"
                  style={{ width: `${(entry.total / maxTotal) * 100}%`, minWidth: "2rem" }}
                >
                  {statusOrder.map((status) => {
                    const count = entry.statusCounts[status] || 0;
                    if (count === 0) return null;
                    const pct = (count / entry.total) * 100;
                    return (
                      <div
                        key={status}
                        className="flex items-center justify-center text-[10px] font-semibold text-white"
                        style={{
                          backgroundColor: statusColors[status].bg,
                          width: `${pct}%`,
                          minWidth: count > 0 ? "1.25rem" : 0,
                        }}
                        title={`${statusColors[status].label}: ${count}`}
                      >
                        {count > 0 && count}
                      </div>
                    );
                  })}
                </div>

                {/* Total count */}
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                  {entry.total} tasks
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
