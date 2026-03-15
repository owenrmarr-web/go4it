import { useCallback } from "react";
import { toast } from "sonner";
import type { UserOrg } from "@/components/AppCard";
import type { MemberConfig } from "@/components/DeployConfigModal";

export function useAddToOrg(
  orgs: UserOrg[],
  setOrgs: React.Dispatch<React.SetStateAction<UserOrg[]>>
) {
  return useCallback(
    async (orgSlug: string, appId: string, memberConfig?: MemberConfig[]) => {
      try {
        const res = await fetch(`/api/organizations/${orgSlug}/apps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appId,
            ...(memberConfig ? { members: memberConfig } : {}),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to add app");
        }

        const result = await res.json();
        const orgName =
          orgs.find((o) => o.slug === orgSlug)?.name || orgSlug;

        setOrgs((prev) =>
          prev.map((org) =>
            org.slug === orgSlug
              ? { ...org, appIds: [...org.appIds, appId] }
              : org
          )
        );

        const deployRes = await fetch(
          `/api/organizations/${orgSlug}/apps/${appId}/deploy`,
          { method: "POST" }
        );

        if (deployRes.ok) {
          toast.success(
            `Deploying ${result.app?.title || "App"} to ${orgName} — fully live in 1-2 minutes`,
            {
              action: {
                label: "My Account",
                onClick: () => (window.location.href = "/account"),
              },
            }
          );
        } else {
          toast.success(`${result.app?.title || "App"} added to ${orgName}`, {
            action: {
              label: "Launch from My Account",
              onClick: () => (window.location.href = "/account"),
            },
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add app";
        toast.error(message);
      }
    },
    [orgs, setOrgs]
  );
}
