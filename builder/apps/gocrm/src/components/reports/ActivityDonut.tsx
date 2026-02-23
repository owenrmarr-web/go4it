"use client";

interface ActivityTypeData {
  type: string;
  count: number;
}

const typeColors: Record<string, { stroke: string; bg: string; label: string }> = {
  CALL: { stroke: "#22c55e", bg: "bg-green-500", label: "Calls" },
  EMAIL: { stroke: "#3b82f6", bg: "bg-blue-500", label: "Emails" },
  MEETING: { stroke: "#a855f7", bg: "bg-purple-500", label: "Meetings" },
  NOTE: { stroke: "#eab308", bg: "bg-yellow-500", label: "Notes" },
};

export default function ActivityDonut({ data }: { data: ActivityTypeData[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-text-faint text-center py-8">
        No activity data yet
      </p>
    );
  }

  // Calculate SVG donut segments
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  const segments = data
    .filter((d) => d.count > 0)
    .map((item) => {
      const fraction = item.count / total;
      const dashLength = fraction * circumference;
      const dashOffset = -cumulativeOffset;
      cumulativeOffset += dashLength;
      const colors = typeColors[item.type] || {
        stroke: "#9ca3af",
        bg: "bg-gray-400",
        label: item.type,
      };
      return {
        ...item,
        dashLength,
        dashOffset,
        color: colors.stroke,
        bg: colors.bg,
        label: colors.label,
      };
    });

  return (
    <div className="flex flex-col items-center gap-6">
      {/* SVG Donut */}
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="20"
              strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
              strokeDashoffset={seg.dashOffset}
              transform="rotate(-90 80 80)"
              className="transition-all duration-500"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text-primary">{total}</span>
          <span className="text-xs text-text-muted">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4">
        {segments.map((seg) => (
          <div key={seg.type} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${seg.bg}`} />
            <span className="text-sm text-text-secondary">
              {seg.label}{" "}
              <span className="font-medium text-text-primary">{seg.count}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
