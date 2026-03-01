/**
 * Pure decision logic for the deploy route.
 * Determines fast-path flags based on OrgApp state and store preview state.
 */
export function determineDeployFlags(
  orgAppStatus: string,
  orgAppFlyAppId: string | null,
  storePreviewFlyAppId: string | null
): {
  existingFlyAppId: string | undefined;
  isPreviewLaunch: boolean;
  consumingStorePreview: boolean;
} {
  const existingFlyAppId =
    (orgAppStatus === "RUNNING" || orgAppStatus === "PREVIEW") && orgAppFlyAppId
      ? orgAppFlyAppId
      : undefined;

  const isPreviewLaunch = orgAppStatus === "PREVIEW" && !!orgAppFlyAppId;

  const consumingStorePreview = !!(
    isPreviewLaunch &&
    existingFlyAppId &&
    storePreviewFlyAppId &&
    existingFlyAppId === storePreviewFlyAppId
  );

  return { existingFlyAppId, isPreviewLaunch, consumingStorePreview };
}
