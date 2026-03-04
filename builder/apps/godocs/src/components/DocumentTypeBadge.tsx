import Badge from "@/components/Badge";

const TYPE_CONFIG: Record<string, { label: string; variant: "neutral" | "success" | "warning" | "error" | "info" | "accent" }> = {
  CONTRACT: { label: "Contract", variant: "info" },
  PROPOSAL: { label: "Proposal", variant: "warning" },
  AGREEMENT: { label: "Agreement", variant: "info" },
  INVOICE: { label: "Invoice", variant: "success" },
  REPORT: { label: "Report", variant: "neutral" },
  TEMPLATE: { label: "Template", variant: "neutral" },
  OTHER: { label: "Other", variant: "neutral" },
};

export default function DocumentTypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] ?? { label: type, variant: "neutral" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
