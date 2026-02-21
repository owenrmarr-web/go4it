import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Top creators on the GO4IT marketplace. See the most loved and most deployed apps.",
  robots: { index: false, follow: false },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
