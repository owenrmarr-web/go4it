"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import Header from "@/components/Header";
import AppCard, { type UserOrg } from "@/components/AppCard";
import { useInteractions } from "@/hooks/useInteractions";
import type { App } from "@/types";

export default function AccountPage() {
  const { data: session } = useSession();
  const [allApps, setAllApps] = useState<App[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [orgs, setOrgs] = useState<UserOrg[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const { hearted, toggle, loading: interactionsLoading } = useInteractions();

  useEffect(() => {
    fetch("/api/apps")
      .then((r) => r.json())
      .then((data: App[]) => {
        setAllApps(data);
        setAppsLoading(false);
      })
      .catch(() => setAppsLoading(false));

    fetch("/api/organizations")
      .then((r) => r.json())
      .then((data: UserOrg[]) => {
        if (Array.isArray(data)) setOrgs(data);
        setOrgsLoading(false);
      })
      .catch(() => setOrgsLoading(false));
  }, []);

  const loading = appsLoading || interactionsLoading || orgsLoading;

  const heartedApps = useMemo(
    () => allApps.filter((app) => hearted.has(app.id)),
    [allApps, hearted]
  );

  const handleAddToOrg = useCallback(
    async (orgSlug: string, appId: string) => {
      try {
        const res = await fetch(`/api/organizations/${orgSlug}/apps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to add app");
        }

        const result = await res.json();
        const orgName = orgs.find((o) => o.slug === orgSlug)?.name || orgSlug;

        setOrgs((prev) =>
          prev.map((org) =>
            org.slug === orgSlug
              ? { ...org, appIds: [...org.appIds, appId] }
              : org
          )
        );

        toast.success(`${result.app?.title || "App"} added to ${orgName}`, {
          action: {
            label: "Go to Org",
            onClick: () => (window.location.href = `/org/${orgSlug}/admin`),
          },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add app";
        toast.error(message);
      }
    },
    [orgs]
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
            My Account
          </h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors border border-gray-200 hover:border-red-300 px-4 py-2 rounded-lg"
          >
            Sign Out
          </button>
        </div>

        {/* Organizations Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-purple-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                />
              </svg>
              My Organizations
            </h2>
            <Link
              href="/org/new"
              className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
            >
              + Create Organization
            </Link>
          </div>
          {orgsLoading ? (
            <div className="flex justify-center py-10 bg-white rounded-xl shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            </div>
          ) : orgs.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl shadow-sm">
              <p className="text-gray-400 mb-4">
                Create an organization to add and deploy apps for your team
              </p>
              <Link
                href="/org/new"
                className="inline-block gradient-brand text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Create Organization
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/org/${org.slug}/admin`}
                  className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                    {org.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {org.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {org.slug}.go4it.live
                      {org.appIds.length > 0 && (
                        <span>
                          {" "}· {org.appIds.length} app
                          {org.appIds.length !== 1 && "s"}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-gray-400 uppercase">
                    {org.role}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
          </div>
        ) : (
          /* Saved (Hearts) */
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-pink-500">♥</span> Saved Apps
            </h2>
            {heartedApps.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                <p className="text-gray-400">
                  Save apps from the marketplace to come back to them later!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {heartedApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isHearted={hearted.has(app.id)}
                    onToggleHeart={() => toggle(app.id, "HEART")}
                    orgs={orgs}
                    onAddToOrg={handleAddToOrg}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
