interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down";
  color?: string;
}

export default function StatsCard({
  title,
  value,
  subtitle,
  trend,
  color,
}: StatsCardProps) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-edge p-6">
      <p className="text-sm font-medium text-fg-muted">{title}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p
          className="text-3xl font-bold"
          style={color ? { color } : undefined}
        >
          {value}
        </p>
        {trend && (
          <span
            className={`flex items-center text-sm font-medium ${
              trend === "up" ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend === "up" ? (
              <svg className="w-4 h-4 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
              </svg>
            )}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-sm text-fg-dim">{subtitle}</p>
      )}
    </div>
  );
}
