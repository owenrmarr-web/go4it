"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface UserProfile {
  companyName: string | null;
  logo: string | null;
}

export default function Header() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);

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
        <Link href="/create">
          <button className="px-5 py-2 rounded-lg border-2 border-orange-500 text-orange-600 font-semibold hover:bg-orange-50 transition-colors">
            Create
          </button>
        </Link>

        {/* Center - absolutely positioned to stay centered */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 flex items-center"
        >
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            GO4IT
          </h1>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {session && profile?.logo && (
            <img
              src={profile.logo}
              alt="Company logo"
              className="h-8 w-8 rounded-lg object-contain border border-gray-200 hidden sm:block"
            />
          )}
          {session && profile?.companyName && (
            <span className="text-sm font-medium text-gray-500 hidden md:inline max-w-32 truncate">
              {profile.companyName}
            </span>
          )}
          {session && (
            <Link href="/account/settings">
              <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              </button>
            </Link>
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
