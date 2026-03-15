import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strategy Deck",
  description:
    "GO4IT strategy deck. AI-powered software marketplace for small businesses.",
  robots: { index: false, follow: false },
};

export default function StrategyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
