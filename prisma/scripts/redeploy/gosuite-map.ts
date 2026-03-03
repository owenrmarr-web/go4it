import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

/**
 * Dynamically build the Go Suite template map by scanning builder/apps/
 * for directories containing a go4it.json manifest.
 *
 * Returns Record<AppTitle, DirectoryName> e.g. { "GoCRM": "gocrm", "GoProject": "project-management" }
 */
export function getGoSuiteTemplateMap(): Record<string, string> {
  const appsDir = join(__dirname, "../../../builder/apps");
  const map: Record<string, string> = {};

  let entries: string[];
  try {
    entries = readdirSync(appsDir);
  } catch {
    console.warn(`[gosuite-map] Could not read ${appsDir}`);
    return map;
  }

  for (const entry of entries) {
    const entryPath = join(appsDir, entry);
    if (!statSync(entryPath).isDirectory()) continue;

    const manifestPath = join(entryPath, "go4it.json");
    try {
      const raw = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(raw);
      if (manifest.name && typeof manifest.name === "string") {
        map[manifest.name] = entry;
      }
    } catch {
      // No go4it.json or invalid JSON — skip
    }
  }

  return map;
}
