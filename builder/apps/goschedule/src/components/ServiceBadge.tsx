interface ServiceBadgeProps {
  name: string;
  color: string | null;
}

export default function ServiceBadge({ name, color }: ServiceBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-fg-secondary">
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color || "#9ca3af" }}
      />
      {name}
    </span>
  );
}
