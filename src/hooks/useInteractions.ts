"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { toggleInteraction } from "@/lib/interactions";
import type { App } from "@/types";

export function useInteractions() {
  const { data: session, status } = useSession();
  const [hearted, setHearted] = useState<Set<string>>(new Set());
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      setHearted(new Set());
      setStarred(new Set());
      setLoading(false);
      return;
    }
    fetch("/api/account/interactions")
      .then((r) => r.json())
      .then((data: { hearts: App[]; stars: App[] }) => {
        setHearted(new Set(data.hearts.map((a) => a.id)));
        setStarred(new Set(data.stars.map((a) => a.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, status]);

  const toggle = useCallback(
    async (appId: string, type: "HEART" | "STAR") => {
      if (!session) {
        toast("Please log in to save apps to your account.");
        return;
      }
      const isActive =
        type === "HEART" ? hearted.has(appId) : starred.has(appId);
      const setter = type === "HEART" ? setHearted : setStarred;

      // Optimistic update
      setter((prev) => {
        const next = new Set(prev);
        if (isActive) next.delete(appId);
        else next.add(appId);
        return next;
      });

      try {
        await toggleInteraction(appId, type, isActive);
      } catch {
        // Rollback
        setter((prev) => {
          const next = new Set(prev);
          if (isActive) next.add(appId);
          else next.delete(appId);
          return next;
        });
        toast.error("Something went wrong. Please try again.");
      }
    },
    [session, hearted, starred]
  );

  return { hearted, starred, toggle, loading };
}
