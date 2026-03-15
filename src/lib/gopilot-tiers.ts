export type GoPilotTierKey = "FREE" | "STARTER" | "PRO" | "UNLIMITED";

export interface GoPilotTier {
  key: GoPilotTierKey;
  label: string;
  dailyLimit: number; // Infinity for unlimited
  price: number; // monthly USD, 0 for free
  description: string;
}

export const GOPILOT_TIERS: Record<GoPilotTierKey, GoPilotTier> = {
  FREE: {
    key: "FREE",
    label: "Free",
    dailyLimit: 10,
    price: 0,
    description: "10 queries per day",
  },
  STARTER: {
    key: "STARTER",
    label: "Starter",
    dailyLimit: 50,
    price: 25,
    description: "50 queries per day",
  },
  PRO: {
    key: "PRO",
    label: "Pro",
    dailyLimit: 100,
    price: 45,
    description: "100 queries per day",
  },
  UNLIMITED: {
    key: "UNLIMITED",
    label: "Unlimited",
    dailyLimit: Infinity,
    price: 95,
    description: "Unlimited queries",
  },
};

export const TIER_ORDER: GoPilotTierKey[] = ["FREE", "STARTER", "PRO", "UNLIMITED"];

/** Get the Stripe price ID for a paid tier */
export function getTierPriceId(tier: GoPilotTierKey): string | null {
  const priceIds: Record<string, string | undefined> = {
    STARTER: process.env.STRIPE_GOPILOT_STARTER,
    PRO: process.env.STRIPE_GOPILOT_PRO,
    UNLIMITED: process.env.STRIPE_GOPILOT_UNLIMITED,
  };
  return priceIds[tier] || null;
}

/** Get daily limit for a tier key */
export function getDailyLimit(tier: string): number {
  const t = GOPILOT_TIERS[tier as GoPilotTierKey];
  return t ? t.dailyLimit : GOPILOT_TIERS.FREE.dailyLimit;
}
