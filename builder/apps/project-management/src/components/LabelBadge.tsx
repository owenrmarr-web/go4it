"use client";

interface LabelBadgeProps {
  name: string;
  color: string;
}

export default function LabelBadge({ name, color }: LabelBadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}1a`,
        color: color,
      }}
    >
      {name}
    </span>
  );
}
