import Badge from "@/components/Badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "neutral" | "success" | "warning" | "error" | "info" | "accent" }> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  IN_REVIEW: { label: "In Review", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  SIGNED: { label: "Signed", variant: "info" },
  EXPIRED: { label: "Expired", variant: "error" },
  ARCHIVED: { label: "Archived", variant: "neutral" },
};

export default function DocumentStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
