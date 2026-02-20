import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const BUILDER_URL = process.env.BUILDER_URL;
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

function builderHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (BUILDER_API_KEY) headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;
  return headers;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const generatedApp = await prisma.generatedApp.findUnique({
    where: { id },
    select: {
      createdById: true,
      status: true,
      sourceDir: true,
      uploadBlobUrl: true,
      previewFlyAppId: true,
    },
  });

  if (!generatedApp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (generatedApp.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (generatedApp.status !== "COMPLETE") {
    return NextResponse.json(
      { error: "App must be fully generated before deploying a draft preview" },
      { status: 409 }
    );
  }

  if (!generatedApp.sourceDir && !generatedApp.uploadBlobUrl) {
    return NextResponse.json(
      { error: "No source available for deployment" },
      { status: 400 }
    );
  }

  if (generatedApp.previewFlyAppId) {
    return NextResponse.json(
      { error: "Draft preview already exists", previewFlyAppId: generatedApp.previewFlyAppId },
      { status: 409 }
    );
  }

  if (!BUILDER_URL) {
    return NextResponse.json(
      { error: "Builder service not configured" },
      { status: 503 }
    );
  }

  // Fire-and-forget to builder
  fetch(`${BUILDER_URL}/deploy-preview`, {
    method: "POST",
    headers: builderHeaders(),
    body: JSON.stringify({ generationId: id, type: "draft" }),
  }).catch((err) => {
    console.error(`[deploy-draft] Failed to trigger builder for ${id}:`, err);
  });

  return NextResponse.json({ status: "accepted", generationId: id });
}
