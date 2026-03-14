"use client";
import { useState } from "react";
import { GOPILOT_TIERS, TIER_ORDER, type GoPilotTierKey } from "@/lib/gopilot-tiers";

interface GoPilotTierPickerProps {
  currentTier: GoPilotTierKey;
  orgSlug: string;
  compact?: boolean; // For embedding in cards (no header)
}

export default function GoPilotTierPicker({ currentTier, orgSlug, compact }: GoPilotTierPickerProps) {
  const [loading, setLoading] = useState<GoPilotTierKey | null>(null);

  const handleSelect = async (tier: GoPilotTierKey) => {
    if (tier === "FREE" || tier === currentTier) return;
    setLoading(tier);
    try {
      const res = await fetch(`/api/portal/${orgSlug}/gopilot/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className={compact ? "" : "space-y-3"}>
      {!compact && (
        <div className="text-center mb-1">
          <p className="text-sm font-semibold text-gray-900">GoPilot Plans</p>
          <p className="text-xs text-gray-500">AI assistant across all your apps</p>
        </div>
      )}
      <div className={`grid ${compact ? "grid-cols-2 gap-2" : "grid-cols-4 gap-3"}`}>
        {TIER_ORDER.map((key) => {
          const tier = GOPILOT_TIERS[key];
          const isCurrent = key === currentTier;
          const isUpgrade = TIER_ORDER.indexOf(key) > TIER_ORDER.indexOf(currentTier);
          const isDowngrade = TIER_ORDER.indexOf(key) < TIER_ORDER.indexOf(currentTier) && key !== "FREE";

          return (
            <div
              key={key}
              className={`rounded-xl p-3 text-center flex flex-col gap-1.5 transition-all ${
                isCurrent
                  ? "bg-purple-50 border-2 border-purple-400 shadow-sm"
                  : "bg-white border border-gray-200 hover:border-purple-200"
              }`}
            >
              <p className="text-sm font-bold text-gray-900">{tier.label}</p>
              <p className="text-lg font-extrabold text-gray-900">
                {tier.price === 0 ? (
                  "$0"
                ) : (
                  <>${tier.price}<span className="text-xs font-normal text-gray-500">/mo</span></>
                )}
              </p>
              <p className="text-xs text-gray-500">{tier.description}</p>

              {isCurrent ? (
                <span className="mt-auto px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-lg">
                  Current Plan
                </span>
              ) : isUpgrade ? (
                <button
                  onClick={() => handleSelect(key)}
                  disabled={loading !== null}
                  className="mt-auto px-2 py-1.5 text-xs font-medium gradient-brand rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading === key ? "Redirecting..." : "Select"}
                </button>
              ) : isDowngrade ? (
                <span className="mt-auto px-2 py-1 text-xs font-medium text-gray-400 bg-gray-50 rounded-lg">
                  Downgrade
                </span>
              ) : (
                <span className="mt-auto px-2 py-1 text-xs text-gray-400">
                  &nbsp;
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
