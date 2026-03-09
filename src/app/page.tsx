"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import AppCard, { type UserOrg } from "@/components/AppCard";
import type { MemberConfig } from "@/components/DeployConfigModal";
import AuthModal from "@/components/AuthModal";
import { useInteractions } from "@/hooks/useInteractions";
import type { App } from "@/types";

export default function Home() {
  const { data: session } = useSession();
  const [apps, setApps] = useState<App[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<UserOrg[]>([]);
  const { hearted, toggle } = useInteractions();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAllApps, setShowAllApps] = useState(false);

  const isSearching = search.trim().length > 0;

  useEffect(() => {
    fetch("/api/apps")
      .then((r) => r.json())
      .then((data: App[]) => {
        setApps(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch user's orgs (with appIds) when logged in
  useEffect(() => {
    if (!session) {
      setOrgs([]);
      return;
    }
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((data: UserOrg[]) => {
        if (Array.isArray(data)) setOrgs(data);
      })
      .catch(() => {});
  }, [session]);

  const handleAddToOrg = useCallback(
    async (orgSlug: string, appId: string, memberConfig?: MemberConfig[]) => {
      try {
        // Step 1: Add app to org (creates OrgApp + assigns members)
        const res = await fetch(`/api/organizations/${orgSlug}/apps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appId,
            ...(memberConfig ? { members: memberConfig } : {}),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to add app");
        }

        const result = await res.json();
        const orgName =
          orgs.find((o) => o.slug === orgSlug)?.name || orgSlug;

        // Update local org state so the button shows "Added"
        setOrgs((prev) =>
          prev.map((org) =>
            org.slug === orgSlug
              ? { ...org, appIds: [...org.appIds, appId] }
              : org
          )
        );

        // Step 2: Explicitly trigger deploy (same as "Launch" button in My Account)
        const deployRes = await fetch(
          `/api/organizations/${orgSlug}/apps/${appId}/deploy`,
          { method: "POST" }
        );

        if (deployRes.ok) {
          toast.success(
            `Deploying ${result.app?.title || "App"} to ${orgName} — fully live in 1-2 minutes`,
            {
              action: {
                label: "My Account",
                onClick: () => (window.location.href = "/account"),
              },
            }
          );
        } else {
          // App was added but deploy failed — user can retry from My Account
          toast.success(`${result.app?.title || "App"} added to ${orgName}`, {
            action: {
              label: "Launch from My Account",
              onClick: () => (window.location.href = "/account"),
            },
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add app";
        toast.error(message);
      }
    },
    [orgs]
  );

  const filteredApps = useMemo(() => {
    if (!search.trim()) return apps;
    const q = search.toLowerCase();
    return apps.filter(
      (app) =>
        app.title.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q)
    );
  }, [apps, search]);

  const visibleApps = isSearching
    ? filteredApps
    : showAllApps
      ? apps
      : apps.slice(0, 4);

  const renderAppCard = (app: App) => (
    <AppCard
      key={app.id}
      app={app}
      isHearted={hearted.has(app.id)}
      onToggleHeart={() => toggle(app.id, "HEART")}
      orgs={orgs}
      onAddToOrg={handleAddToOrg}
      onAuthRequired={() => setShowAuthModal(true)}
    />
  );

  const renderAppGrid = (appList: App[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {appList.map(renderAppCard)}
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="bg-black pt-28 sm:pt-40 pb-20 sm:pb-28 px-4 text-center text-white relative overflow-hidden">
        {/* Background video */}
        <video
          src="https://0vve0c2rxedop1n8.public.blob.vercel-storage.com/go4it-hero-clip.mp4?v=2"
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 w-full object-cover object-top opacity-40"
        />
        <div className="relative z-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold drop-shadow-lg">
            GO4IT
          </h1>
          <p className="mt-3 sm:mt-4 text-2xl sm:text-3xl md:text-4xl opacity-90 font-bold max-w-4xl mx-auto leading-tight">
            Run your business on software that costs 10x less.
          </p>
          <p className="mt-3 opacity-70 text-base sm:text-lg max-w-2xl mx-auto">
            Browse, deploy, and start using apps for your business in minutes — Let&apos;s GO4IT
          </p>
          <a
            href="/create"
            className="inline-block mt-6 bg-white text-purple-700 px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            Create Apps for Free
          </a>
        </div>
      </section>

      {/* Search — overlaps hero with negative margin */}
      <section className="max-w-7xl mx-auto px-4 -mt-7 relative z-10">
        <SearchBar value={search} onChange={setSearch} />
      </section>

      {isSearching ? (
        /* Search mode: full results grid */
        <section className="max-w-7xl mx-auto px-4 py-10">
          {filteredApps.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-gray-400">
                No apps match your search.
              </p>
              <p className="text-gray-400 mt-1">
                Try a different keyword or browse all apps.
              </p>
              <button
                onClick={() => setSearch("")}
                className="mt-4 text-purple-600 font-semibold hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            renderAppGrid(filteredApps)
          )}
        </section>
      ) : (
        <>
          {/* Featured Apps */}
          <section className="gradient-brand py-10 px-4">
            <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
              </div>
            ) : apps.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🚀</div>
                <p className="text-xl font-semibold text-gray-700">
                  No apps yet — be the first to create one!
                </p>
                <p className="text-gray-400 mt-2 max-w-md mx-auto">
                  Describe your dream business tool and our AI will build it
                  for you in minutes.
                </p>
                <a
                  href="/create"
                  className="inline-block mt-6 gradient-brand px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 transition-opacity"
                >
                  Create Your First App
                </a>
              </div>
            ) : (
              <>
                <h2 className="text-2xl sm:text-3xl font-bold mb-6">
                  Featured Apps
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {apps.slice(0, 4).map(renderAppCard)}
                </div>

                {/* Expanded rows: 4-wide grid */}
                {showAllApps && apps.length > 4 && (
                  <div className="mt-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {apps.slice(4).map(renderAppCard)}
                    </div>
                  </div>
                )}

                {!showAllApps && apps.length > 4 && (
                  <div className="text-center mt-8">
                    <button
                      onClick={() => setShowAllApps(true)}
                      className="bg-white text-purple-700 px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    >
                      Browse All Apps
                    </button>
                  </div>
                )}
              </>
            )}
            </div>
          </section>

          {/* How It Works */}
          <section className="max-w-7xl mx-auto px-4 py-16 sm:py-20">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center mb-12">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {[
                {
                  num: "1",
                  title: "Browse or Build",
                  desc: "Find apps in our marketplace or describe what you need and AI builds it.",
                },
                {
                  num: "2",
                  title: "Add & Assign",
                  desc: "Add apps to your organization and give your team the access they need.",
                },
                {
                  num: "3",
                  title: "Deploy & Go",
                  desc: "Apps deploy instantly in the browser. Nothing to install or maintain.",
                },
              ].map((step) => (
                <div key={step.num} className="text-center">
                  <div className="w-14 h-14 rounded-full gradient-brand flex items-center justify-center text-2xl font-bold mx-auto">
                    {step.num}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-gray-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Side-by-side CTA cards */}
          <section className="max-w-7xl mx-auto px-4 pb-16 sm:pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <a
                href="/create"
                className="group rounded-2xl border-2 border-gray-200 bg-white p-8 sm:p-10 hover:border-pink-300 hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Can&apos;t find what you need?
                </h3>
                <p className="mt-2 text-gray-600">
                  Describe your dream business tool in plain English and our AI will build it for you in minutes.
                </p>
                <span className="mt-4 inline-flex items-center gap-1 font-semibold gradient-brand-text group-hover:gap-2 transition-all">
                  Build with AI <span aria-hidden="true">&rarr;</span>
                </span>
              </a>

              <a
                href="/pricing"
                className="group rounded-2xl border-2 border-gray-200 bg-white p-8 sm:p-10 hover:border-purple-300 hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                  $5/app + $1/seat/month
                </h3>
                <p className="mt-2 text-gray-600">
                  Enterprise-grade tools at a fraction of the cost. See how much your business could save.
                </p>
                <span className="mt-4 inline-flex items-center gap-1 font-semibold gradient-brand-text group-hover:gap-2 transition-all">
                  See pricing <span aria-hidden="true">&rarr;</span>
                </span>
              </a>
            </div>
          </section>

          {/* Full demo video */}
          <section className="gradient-brand py-16 sm:py-20 px-4">
            <div className="max-w-4xl mx-auto text-center mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
                Small businesses spend an average of $1,400 a year per employee on software.
                <br />
                <span className="opacity-80">We think that&apos;s too much.</span>
              </h2>
            </div>
            <div className="max-w-5xl mx-auto">
            <video
              src="https://0vve0c2rxedop1n8.public.blob.vercel-storage.com/go4it-demo.mp4"
              controls
              muted
              playsInline
              className="w-full rounded-2xl shadow-2xl"
            />
            </div>
          </section>
        </>
      )}

      {showAuthModal && (
        <AuthModal
          closable
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => { setShowAuthModal(false); window.location.reload(); }}
        />
      )}

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
