import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const BUILDER_URL = process.env.BUILDER_URL;
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // In local dev, check in-memory previews
  if (!BUILDER_URL) {
    try {
      const { getPreview } = await import("@/lib/previewer");
      const preview = getPreview(id);
      if (!preview) return NextResponse.json({ status: "stopped" });
      return NextResponse.json(preview);
    } catch {
      return NextResponse.json({ status: "stopped" });
    }
  }

  // Production: no in-memory state — preview is a Fly.io app
  const shortId = id.slice(0, 8);
  const previewUrl = `https://go4it-preview-${shortId}.fly.dev`;
  return NextResponse.json({ status: "running", url: previewUrl });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const generatedApp = await prisma.generatedApp.findUnique({
    where: { id },
    select: { createdById: true, sourceDir: true, status: true },
  });

  if (!generatedApp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (generatedApp.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delegate to builder service if configured
  if (BUILDER_URL) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (BUILDER_API_KEY) headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;

      const res = await fetch(`${BUILDER_URL}/preview`, {
        method: "POST",
        headers,
        body: JSON.stringify({ generationId: id }),
      });

      if (!res.ok) {
        const error = await res.text();
        return NextResponse.json(
          { error: `Preview failed: ${error}` },
          { status: 500 }
        );
      }

      const data = await res.json();
      return NextResponse.json({ url: data.url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Builder service unavailable";
      return NextResponse.json({ error: message }, { status: 503 });
    }
  }

  // Local dev fallback
  if (!generatedApp.sourceDir) {
    return NextResponse.json(
      { error: "No source directory found for this app" },
      { status: 400 }
    );
  }

  try {
    const { startPreview } = await import("@/lib/previewer");
    const { url } = await startPreview(id, generatedApp.sourceDir);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start preview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Delegate to builder service if configured
  if (BUILDER_URL) {
    try {
      const headers: Record<string, string> = {};
      if (BUILDER_API_KEY) headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;

      await fetch(`${BUILDER_URL}/preview/${id}`, {
        method: "DELETE",
        headers,
      });
    } catch {
      // Best effort cleanup
    }
    return new Response(null, { status: 204 });
  }

  // Local dev fallback
  try {
    const { stopPreview } = await import("@/lib/previewer");
    stopPreview(id);
  } catch {
    // Already stopped
  }
  return new Response(null, { status: 204 });
}
