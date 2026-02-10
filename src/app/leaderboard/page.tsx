"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Creator {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  appCount: number;
  totalHearts: number;
  totalDeploys: number;
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"hearts" | "deploys">("hearts");
  const [byHearts, setByHearts] = useState<Creator[]>([]);
  const [byDeploys, setByDeploys] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setByHearts(data.byHearts || []);
        setByDeploys(data.byDeploys || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const creators = tab === "hearts" ? byHearts : byDeploys;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-purple-50 pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          ← Back to App Store
        </Link>
        <h1 className="text-3xl font-extrabold text-center gradient-brand-text mb-2">
          Leaderboard
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Top creators on the GO4IT marketplace
        </p>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setTab("hearts")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === "hearts"
                ? "bg-pink-100 text-pink-700"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            ♥ Most Loved
          </button>
          <button
            onClick={() => setTab("deploys")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === "deploys"
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            🚀 Most Used
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading...</div>
        ) : creators.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No creators yet. Be the first to publish an app!
          </div>
        ) : (
          <div className="space-y-3">
            {creators.map((creator, i) => (
              <div
                key={creator.id}
                className={`flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm border ${
                  i < 3 ? "border-yellow-200" : "border-gray-100"
                }`}
              >
                {/* Rank */}
                <div className="w-8 text-center shrink-0">
                  {i < 3 ? (
                    <span className="text-xl">{medals[i]}</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400">
                      {i + 1}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-300 to-purple-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {creator.image ? (
                    <img
                      src={creator.image}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    creator.name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Name + username */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {creator.name}
                  </p>
                  {creator.username && (
                    <p className="text-xs text-gray-400">
                      @{creator.username}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Apps</p>
                    <p className="font-bold text-gray-700">
                      {creator.appCount}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">
                      {tab === "hearts" ? "Hearts" : "Deploys"}
                    </p>
                    <p
                      className={`font-bold ${
                        tab === "hearts" ? "text-pink-600" : "text-purple-600"
                      }`}
                    >
                      {tab === "hearts"
                        ? creator.totalHearts
                        : creator.totalDeploys}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
