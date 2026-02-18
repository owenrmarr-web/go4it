"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useGeneration } from "./GenerationContext";

interface UserProfile {
  companyName: string | null;
  logo: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  pending: "Starting...",
  designing: "Designing...",
  scaffolding: "Scaffolding...",
  coding: "Building...",
  database: "Database...",
  finalizing: "Finalizing...",
};

export default function Header() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const gen = useGeneration();

  const isGenerating =
    gen.stage !== "idle" && gen.stage !== "complete" && gen.stage !== "failed";

  useEffect(() => {
    if (session?.user) {
      fetch("/api/account/profile")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setProfile({ companyName: data.companyName, logo: data.logo });
          }
        })
        .catch(() => {});
    }
  }, [session]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 py-4 relative flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-2">
          <Link href="/">
            <button className="px-5 py-2 rounded-lg border-2 border-theme-accent text-theme-accent font-semibold hover:opacity-80 transition-opacity">
              App Store
            </button>
          </Link>
          <Link href="/create">
            <button className="px-5 py-2 rounded-lg border-2 border-theme-accent text-theme-accent font-semibold hover:opacity-80 transition-opacity">
              Create
            </button>
          </Link>
          <Link href="/developers">
            <button className="px-5 py-2 rounded-lg border-2 border-theme-accent text-theme-accent font-semibold hover:opacity-80 transition-opacity">
              Developers
            </button>
          </Link>
          <Link href="/leaderboard">
            <button className="px-2.5 py-2 rounded-lg border-2 border-theme-accent text-theme-accent hover:opacity-80 transition-opacity text-base leading-none" title="Leaderboard">
              🏅
            </button>
          </Link>
          {isAdmin && (
            <Link href="/admin">
              <button className="px-3 py-2 rounded-lg text-xs font-semibold text-purple-600 border border-purple-200 hover:bg-purple-50 transition-colors">
                Admin
              </button>
            </Link>
          )}

          {/* Generation progress chip */}
          {gen.generationId && gen.stage !== "idle" && (
            <Link
              href={`/create?gen=${gen.generationId}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-50 to-purple-50 border border-purple-200 hover:border-purple-400 transition-colors"
            >
              {isGenerating && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
                </span>
              )}
              {gen.stage === "complete" && (
                <span className="text-green-500 text-sm">&#10003;</span>
              )}
              {gen.stage === "failed" && (
                <span className="text-red-500 text-sm">&#10007;</span>
              )}
              <span className="text-xs font-medium text-gray-700 max-w-[120px] truncate">
                {isGenerating
                  ? STAGE_LABELS[gen.stage] || "Building..."
                  : gen.stage === "complete"
                    ? gen.title || "App ready!"
                    : "Failed"}
              </span>
            </Link>
          )}
        </div>

        {/* Center - absolutely positioned to stay centered */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 flex items-center"
        >
          <h1 className="text-3xl font-extrabold gradient-brand-text">
            GO4IT
          </h1>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {session && profile?.logo && (
            <img
              src={profile.logo}
              alt="Company logo"
              className="h-10 w-10 rounded-lg object-contain border border-gray-200 hidden sm:block"
            />
          )}
          {session && profile?.companyName && (
            <span className="text-sm font-medium text-gray-500 hidden md:inline max-w-52 truncate">
              {profile.companyName}
            </span>
          )}
          <Link href={session ? "/account" : "/auth"}>
            <button className="gradient-brand px-5 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity shadow-sm">
              My Account
            </button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
