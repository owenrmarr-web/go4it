import { existsSync, rmSync, readdirSync, statSync } from "fs";
import path from "path";
import prisma from "./prisma.js";
import { destroyApp } from "./fly.js";

const APPS_DIR = process.env.APPS_DIR || "/data/apps";
const STALE_WORKSPACE_HOURS = 24;

/**
 * Delete a workspace directory for a given generation ID.
 * Called after publish to free disk space on the builder volume.
 */
export function deleteWorkspace(generationId: string): boolean {
  const dir = path.join(APPS_DIR, generationId);
  if (!existsSync(dir)) return false;

  try {
    rmSync(dir, { recursive: true, force: true });
    console.log(`[Cleanup] Deleted workspace ${generationId}`);
    return true;
  } catch (err) {
    console.error(
      `[Cleanup] Failed to delete workspace ${generationId}:`,
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

/**
 * Clean up stale workspaces older than STALE_WORKSPACE_HOURS.
 * Only removes workspaces for COMPLETE or FAILED generations (not active ones).
 */
export async function cleanupStaleWorkspaces(): Promise<void> {
  try {
    if (!existsSync(APPS_DIR)) return;

    const entries = readdirSync(APPS_DIR);
    const cutoff = Date.now() - STALE_WORKSPACE_HOURS * 60 * 60 * 1000;
    let cleaned = 0;

    for (const entry of entries) {
      const fullPath = path.join(APPS_DIR, entry);
      try {
        const stat = statSync(fullPath);
        if (!stat.isDirectory()) continue;
        if (stat.mtimeMs > cutoff) continue;

        // Check DB — only clean up finished generations that aren't published
        const gen = await prisma.generatedApp.findUnique({
          where: { id: entry },
          select: { status: true, appId: true },
        });

        // Preserve source for published apps (appId set) — they need it for deployment
        if (gen?.appId) continue;

        if (!gen || gen.status === "COMPLETE" || gen.status === "FAILED") {
          rmSync(fullPath, { recursive: true, force: true });
          cleaned++;
          console.log(`[Cleanup] Removed stale workspace ${entry}`);
        }
      } catch (err) {
        console.error(
          `[Cleanup] Error checking workspace ${entry}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    if (cleaned > 0) {
      console.log(`[Cleanup] Removed ${cleaned} stale workspace(s)`);
    }
  } catch (err) {
    console.error(
      "[Cleanup] Error running stale workspace cleanup:",
      err instanceof Error ? err.message : err
    );
  }
}

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
        // Draft previews on both published and unpublished apps get cleaned up.
        // Store previews (App.previewFlyAppId) are managed separately and never expire.
      },
      select: {
        id: true,
        previewFlyAppId: true,
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

        // Clear draft preview fields on GeneratedApp (keep source code)
        await prisma.generatedApp.update({
          where: { id: gen.id },
          data: {
            previewFlyAppId: null,
            previewFlyUrl: null,
            previewExpiresAt: null,
          },
        });

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
