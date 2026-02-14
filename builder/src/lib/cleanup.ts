import prisma from "./prisma.js";
import { destroyApp } from "./fly.js";

/**
 * Clean up expired preview deployments.
 * Destroys the Fly.io machine but preserves source code on the builder volume.
 * Users can re-generate a preview anytime.
 */
export async function cleanupExpiredPreviews(): Promise<void> {
  try {
    const expired = await prisma.generatedApp.findMany({
      where: {
        previewFlyAppId: { not: null },
        previewExpiresAt: { lt: new Date() },
      },
      select: {
        id: true,
        previewFlyAppId: true,
        appId: true,
      },
    });

    if (expired.length === 0) return;

    console.log(
      `[Cleanup] Found ${expired.length} expired preview(s) to clean up`
    );

    for (const gen of expired) {
      try {
        console.log(
          `[Cleanup] Destroying preview ${gen.previewFlyAppId} for generation ${gen.id}`
        );
        await destroyApp(gen.previewFlyAppId!);

        // Clear preview fields on GeneratedApp (keep source code)
        await prisma.generatedApp.update({
          where: { id: gen.id },
          data: {
            previewFlyAppId: null,
            previewFlyUrl: null,
            previewExpiresAt: null,
          },
        });

        // Update OrgApp status to STOPPED if one exists
        if (gen.appId) {
          await prisma.orgApp.updateMany({
            where: {
              appId: gen.appId,
              status: "PREVIEW",
            },
            data: {
              status: "STOPPED",
              flyAppId: null,
              flyUrl: null,
            },
          });
        }

        console.log(
          `[Cleanup] Preview ${gen.previewFlyAppId} destroyed for generation ${gen.id}`
        );
      } catch (err) {
        console.error(
          `[Cleanup] Failed to clean up ${gen.previewFlyAppId}:`,
          err instanceof Error ? err.message : err
        );
      }
    }
  } catch (err) {
    console.error(
      "[Cleanup] Error running preview cleanup:",
      err instanceof Error ? err.message : err
    );
  }
}
