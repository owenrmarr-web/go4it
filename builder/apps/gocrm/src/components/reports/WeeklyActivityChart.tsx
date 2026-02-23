"use client";

interface WeekData {
  label: string;
  count: number;
}

export default function WeeklyActivityChart({ data }: { data: WeekData[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  if (data.every((d) => d.count === 0)) {
    return (
      <p className="text-sm text-text-faint text-center py-8">
        No activity data yet
      </p>
    );
  }

  return (
    <div className="flex items-end justify-between gap-3 h-48 px-2">
      {data.map((week, i) => {
        const heightPct = Math.max((week.count / maxCount) * 100, 4);
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-2">
            {/* Count label */}
            <span className="text-xs font-medium text-text-secondary">
              {week.count}
            </span>
            {/* Bar */}
            <div className="w-full flex justify-center" style={{ height: "140px" }}>
              <div className="relative w-full max-w-14 flex items-end">
                <div
                  className="w-full bg-purple-500 rounded-t-lg transition-all duration-500"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            </div>
            {/* Label */}
            <span className="text-xs text-text-muted text-center whitespace-nowrap">
              {week.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
