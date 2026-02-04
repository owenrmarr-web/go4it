"use client";
import { useState, useEffect, useMemo } from "react";
import { signOut } from "next-auth/react";
import Header from "@/components/Header";
import AppCard from "@/components/AppCard";
import { useInteractions } from "@/hooks/useInteractions";
import type { App } from "@/types";

export default function AccountPage() {
  const [allApps, setAllApps] = useState<App[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const { hearted, starred, toggle, loading: interactionsLoading } =
    useInteractions();

  useEffect(() => {
    fetch("/api/apps")
      .then((r) => r.json())
      .then((data: App[]) => {
        setAllApps(data);
        setAppsLoading(false);
      })
      .catch(() => setAppsLoading(false));
  }, []);

  const loading = appsLoading || interactionsLoading;

  const heartedApps = useMemo(
    () => allApps.filter((app) => hearted.has(app.id)),
    [allApps, hearted]
  );
  const starredApps = useMemo(
    () => allApps.filter((app) => starred.has(app.id)),
    [allApps, starred]
  );

  const handleSignOut = async () => {
    await signOut({ redirect: true, redirectTo: "/" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 pt-28 pb-16">
        {/* Header row */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            My Apps
          </h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors border border-gray-200 hover:border-red-300 px-4 py-2 rounded-lg"
          >
            Sign Out
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
          </div>
        ) : (
          <>
            {/* Saved (Hearts) */}
            <section className="mb-12">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-pink-500">♥</span> Saved Apps
              </h2>
              {heartedApps.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                  <p className="text-gray-400">
                    Heart apps from the marketplace to save them here!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {heartedApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      isHearted={hearted.has(app.id)}
                      isStarred={starred.has(app.id)}
                      onToggleHeart={() => toggle(app.id, "HEART")}
                      onToggleStar={() => toggle(app.id, "STAR")}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Deployed (Stars) */}
            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-purple-500">★</span> Deployed Apps
              </h2>
              {starredApps.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                  <p className="text-gray-400">
                    Star apps from the marketplace to deploy them for your
                    business!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {starredApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      isHearted={hearted.has(app.id)}
                      isStarred={starred.has(app.id)}
                      onToggleHeart={() => toggle(app.id, "HEART")}
                      onToggleStar={() => toggle(app.id, "STAR")}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
