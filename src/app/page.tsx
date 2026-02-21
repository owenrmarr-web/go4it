"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import AppCard, { type UserOrg } from "@/components/AppCard";
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

        toast.success(`${result.app?.title || "App"} added to ${orgName}`, {
          action: {
            label: "My Account",
            onClick: () => (window.location.href = "/account"),
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
          Browse, deploy, and start using apps tailored to your business in minutes — Let&apos;s GO4IT
        </p>
      </section>

      {/* Search — overlaps hero with negative margin */}
      <section className="max-w-7xl mx-auto px-4 -mt-7 relative z-10">
        <SearchBar value={search} onChange={setSearch} />
      </section>

      {/* App Grid */}
      <section className="max-w-7xl mx-auto px-4 py-10">
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
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-400">
              No apps match your search.
            </p>
            <p className="text-gray-400 mt-1">
              Try a different keyword or browse all apps.
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-4 text-purple-600 font-semibold hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                isHearted={hearted.has(app.id)}
                onToggleHeart={() => toggle(app.id, "HEART")}
                orgs={orgs}
                onAddToOrg={handleAddToOrg}
                onAuthRequired={() => setShowAuthModal(true)}
              />
            ))}
          </div>
        )}
      </section>

      {showAuthModal && (
        <AuthModal
          closable
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => { setShowAuthModal(false); window.location.reload(); }}
        />
      )}
    </div>
  );
}
