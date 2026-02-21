import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investor Deck",
  description:
    "GO4IT investor pitch deck. AI-powered software marketplace for small businesses.",
  robots: { index: false, follow: false },
};

export default function DeckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
