import prisma from "@/lib/prisma";
import Header from "@/components/Header";
import MarketplaceGrid from "@/components/MarketplaceGrid";
import type { App } from "@/types";

export default async function Home() {
  const rawApps = await prisma.app.findMany({
    where: {
      isPublic: true,
      generatedApp: { isNot: null },
    },
    include: {
      generatedApp: {
        select: {
          marketplaceVersion: true,
          screenshot: true,
          previewFlyUrl: true,
          createdBy: { select: { username: true } },
        },
      },
      _count: {
        select: {
          interactions: { where: { type: "HEART" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const apps: App[] = rawApps.map(({ generatedApp, _count, ...app }) => ({
    ...app,
    longDescription: app.longDescription ?? null,
    tags: app.tags ?? "",
    isGoSuite: app.isGoSuite,
    createdAt: app.createdAt.toISOString(),
    version: generatedApp ? `V${generatedApp.marketplaceVersion}.0` : null,
    creatorUsername: generatedApp?.createdBy?.username || null,
    screenshot: app.screenshot || generatedApp?.screenshot || null,
    heartCount: _count?.interactions ?? 0,
    previewUrl: app.previewUrl || generatedApp?.previewFlyUrl || null,
    previewRebuilding: app.previewRebuilding,
  }));

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="gradient-brand pt-24 sm:pt-32 pb-10 sm:pb-14 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold drop-shadow-lg">
          GO4IT
        </h1>
        <p className="mt-3 sm:mt-4 text-lg sm:text-xl md:text-2xl opacity-90 font-medium max-w-3xl mx-auto">
          AI-enabled software tools to help small businesses do big things.
        </p>
        <p className="mt-2 opacity-70 text-base max-w-2xl mx-auto">
          Browse, deploy, and start using apps for your business in minutes — Let&apos;s GO4IT
        </p>
      </section>

      <MarketplaceGrid apps={apps} />

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span
              className="text-lg font-extrabold"
              style={{
                background: "linear-gradient(to right, #f97316, #ec4899, #9333ea)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >GO4IT</span>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              AI-powered software tools for efficient businesses.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              &copy; {new Date().getFullYear()} GO4IT. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
            <a href="/bugs" className="hover:text-gray-800 transition-colors">Report a Bug</a>
            <a href="/developer" className="hover:text-gray-800 transition-colors">Developers</a>
            <a href="/deck" className="hover:text-gray-800 transition-colors">Investor Deck</a>
            <a href="/leaderboard" className="hover:text-gray-800 transition-colors">Leaderboard</a>
            <a href="/contact" className="hover:text-gray-800 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
