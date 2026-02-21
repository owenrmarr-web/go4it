import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Enterprise-grade business apps at a fraction of the cost. $5/app/month + $1/seat. Compare savings vs traditional SaaS tools.",
  openGraph: {
    title: "Pricing — GO4IT",
    description:
      "Enterprise-grade business apps at a fraction of the cost. $5/app/month + $1/seat.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
