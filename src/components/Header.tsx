"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isGenerating =
    gen.stage !== "idle" && gen.stage !== "complete" && gen.stage !== "failed";

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileMenuOpen]);

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
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>

        {/* Left side — desktop only */}
        <div className="hidden md:flex items-center gap-2">
          {[
            { href: "/", label: "App Store" },
            { href: "/create", label: "Create" },
            { href: "/pricing", label: "Pricing" },
          ].map(({ href, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href}>
                <button className={`px-5 py-2 rounded-lg border-2 border-theme-accent font-semibold hover:opacity-80 transition-opacity ${isActive ? "text-white" : "text-theme-accent"}`} style={isActive ? { backgroundColor: "var(--theme-accent)" } : undefined}>
                  {label}
                </button>
              </Link>
            );
          })}
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

        {/* Center logo */}
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
          {/* Generation progress chip — mobile only */}
          {gen.generationId && gen.stage !== "idle" && (
            <Link
              href={`/create?gen=${gen.generationId}`}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-50 to-purple-50 border border-purple-200"
            >
              {isGenerating && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                </span>
              )}
              {gen.stage === "complete" && (
                <span className="text-green-500 text-xs">&#10003;</span>
              )}
              {gen.stage === "failed" && (
                <span className="text-red-500 text-xs">&#10007;</span>
              )}
            </Link>
          )}
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
            <button className="gradient-brand px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity shadow-sm text-sm md:text-base md:px-5">
              My Account
            </button>
          </Link>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-1">
          {[
            { href: "/", label: "App Store" },
            { href: "/create", label: "Create" },
            { href: "/pricing", label: "Pricing" },
          ].map(({ href, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)} className={`block px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors ${isActive ? "text-theme-accent font-bold" : "text-gray-700"}`}>
                {label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-purple-600 font-medium hover:bg-purple-50 transition-colors">
              Admin
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
