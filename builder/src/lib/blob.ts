import JSZip from "jszip";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import os from "os";

/**
 * Downloads a zip from a Vercel Blob URL, extracts it, and returns the
 * path to the directory containing package.json.
 */
export async function downloadAndExtractBlob(
  blobUrl: string,
  orgAppId: string
): Promise<string> {
  const res = await fetch(blobUrl);
  if (!res.ok) {
    throw new Error(`Failed to download blob: ${res.status} ${res.statusText}`);
  }

  const buffer = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const tmpBase = path.join(os.tmpdir(), `go4it-deploy-${orgAppId}`);
  mkdirSync(tmpBase, { recursive: true });

  // Extract all files
  const entries = Object.entries(zip.files);
  for (const [relativePath, file] of entries) {
    if (file.dir) {
      mkdirSync(path.join(tmpBase, relativePath), { recursive: true });
      continue;
    }
    const content = await file.async("nodebuffer");
    const filePath = path.join(tmpBase, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }

  // Find the directory containing package.json (might be at root or nested one level)
  const fileNames = Object.keys(zip.files);
  if (fileNames.includes("package.json")) {
    return tmpBase;
  }

  // Check one level deep (e.g., "my-app/package.json")
  const nested = fileNames.find((e) => /^[^/]+\/package\.json$/.test(e));
  if (nested) {
    const nestedDir = nested.split("/")[0];
    return path.join(tmpBase, nestedDir);
  }

  // Fall back to the extraction root
  return tmpBase;
}
