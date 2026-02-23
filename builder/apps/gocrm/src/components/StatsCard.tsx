interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
}

export default function StatsCard({ title, value, subtitle, icon }: StatsCardProps) {
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border-subtle p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-muted">{title}</p>
          <p className="mt-1 text-3xl font-bold text-text-primary">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-text-faint">{subtitle}</p>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-purple-50 text-purple-600">
          {icon}
        </div>
      </div>
    </div>
  );
}
