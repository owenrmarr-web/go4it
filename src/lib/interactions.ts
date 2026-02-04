import type { InteractionType } from "@/types";

export async function toggleInteraction(
  appId: string,
  type: InteractionType,
  currentlyActive: boolean
) {
  const method = currentlyActive ? "DELETE" : "POST";
  const res = await fetch("/api/interactions", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId, type }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Request failed");
  }
  return res.json();
}
