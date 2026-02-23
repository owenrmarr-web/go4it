interface StageBadgeProps {
  stage: string;
}

const stageColors: Record<string, string> = {
  LEAD: "bg-blue-50 text-blue-700",
  PROSPECT: "bg-orange-50 text-orange-700",
  CUSTOMER: "bg-green-50 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
  CHURNED: "bg-red-50 text-red-700",
  INTERESTED: "bg-blue-50 text-blue-700",
  QUOTED: "bg-orange-50 text-orange-700",
  COMMITTED: "bg-purple-50 text-purple-700",
  WON: "bg-green-50 text-green-700",
  LOST: "bg-red-50 text-red-700",
};

export default function StageBadge({ stage }: StageBadgeProps) {
  const colorClass = stageColors[stage] || "bg-gray-100 text-gray-500";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {stage.charAt(0) + stage.slice(1).toLowerCase()}
    </span>
  );
}
