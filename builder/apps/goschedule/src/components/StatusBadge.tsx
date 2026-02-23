interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  confirmed: "bg-status-blue text-status-blue-fg",
  completed: "bg-status-green text-status-green-fg",
  no_show: "bg-status-red text-status-red-fg",
  cancelled: "bg-elevated text-fg-muted",
  rescheduled: "bg-status-amber text-status-amber-fg",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmed",
  completed: "Completed",
  no_show: "No Show",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] || "bg-elevated text-fg-muted";
  const label = statusLabels[status] || status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
