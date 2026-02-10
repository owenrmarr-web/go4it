"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface PortalApp {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  url: string | null;
  subdomain: string | null;
  version: string | null;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface PortalData {
  name: string;
  slug: string;
  logo: string | null;
  themeColors: ThemeColors | null;
  apps: PortalApp[];
}

const defaultColors: ThemeColors = {
  primary: "#9333EA",
  secondary: "#EC4899",
  accent: "#F97316",
};

export default function OrgPortalPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/portal/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Organization not found
          </h1>
          <p className="text-gray-500 mb-6">
            This portal doesn&apos;t exist or has no deployed apps yet.
          </p>
          <Link
            href="/"
            className="inline-block bg-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Go to GO4IT
          </Link>
        </div>
      </div>
    );
  }

  const colors = data.themeColors || defaultColors;
  const gradient = `linear-gradient(135deg, ${colors.accent}, ${colors.secondary}, ${colors.primary})`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header
        className="relative overflow-hidden"
        style={{ background: gradient }}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative max-w-5xl mx-auto px-6 py-12 md:py-16">
          <div className="flex items-center gap-5">
            {data.logo ? (
              <img
                src={data.logo}
                alt={`${data.name} logo`}
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover bg-white/20 backdrop-blur-sm shadow-lg"
              />
            ) : (
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg flex items-center justify-center text-white text-2xl md:text-3xl font-bold"
              >
                {data.name[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white drop-shadow-sm">
                {data.name}
              </h1>
              <p className="text-white/80 text-sm md:text-base mt-1">
                {data.apps.length} app{data.apps.length !== 1 ? "s" : ""}{" "}
                available
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* App Grid */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
        {data.apps.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              No apps deployed yet
            </h2>
            <p className="text-gray-500">
              Apps will appear here once the team admin deploys them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.apps.map((app) => (
              <AppLauncherCard
                key={app.id}
                app={app}
                accentColor={colors.primary}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <Link
          href="https://go4it.live"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Powered by{" "}
          <span className="font-semibold">GO4IT</span>
        </Link>
      </footer>
    </div>
  );
}

function AppLauncherCard({
  app,
  accentColor,
}: {
  app: PortalApp;
  accentColor: string;
}) {
  const canLaunch = !!app.url;

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group border border-gray-100">
      <div className="p-6">
        {/* Icon + Category */}
        <div className="flex items-start justify-between mb-4">
          <span className="text-4xl">{app.icon}</span>
          <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
            {app.category}
          </span>
        </div>

        {/* Title + Version + Description */}
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-bold text-gray-900">{app.title}</h3>
          {app.version && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">
              {app.version}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 mb-6">
          {app.description}
        </p>

        {/* Launch Button */}
        {canLaunch ? (
          <a
            href={app.url!}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2.5 px-4 rounded-xl text-white font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
            style={{ backgroundColor: accentColor }}
          >
            Launch App
          </a>
        ) : (
          <div className="block w-full text-center py-2.5 px-4 rounded-xl bg-gray-100 text-gray-400 font-semibold text-sm">
            Coming Soon
          </div>
        )}
      </div>
    </div>
  );
}
