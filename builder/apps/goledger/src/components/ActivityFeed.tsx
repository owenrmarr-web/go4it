interface ActivityItem {
  type: "invoice" | "payment" | "expense";
  description: string;
  amount: number;
  date: string;
  status?: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

const typeConfig = {
  invoice: { bg: "bg-blue-50", color: "text-blue-600", label: "INV" },
  payment: { bg: "bg-green-50", color: "text-green-600", label: "PAY" },
  expense: { bg: "bg-orange-50", color: "text-orange-600", label: "EXP" },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No recent activity</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const config = typeConfig[item.type];
        return (
          <div key={i} className="flex items-start gap-3">
            <div className={`w-8 h-8 ${config.bg} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
              <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.description}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                {" · "}
                {timeAgo(item.date)}
              </p>
            </div>
            {item.status && (
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{item.status}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
