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
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submission = await prisma.generatedApp.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, username: true } },
    },
  });

  if (!submission || submission.source !== "uploaded") {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 }
    );
  }

  if (submission.appId) {
    return NextResponse.json(
      { error: "Already published" },
      { status: 400 }
    );
  }

  const manifest = JSON.parse(submission.manifestJson || "{}");
  const author = submission.createdBy.username
    ? `@${submission.createdBy.username}`
    : submission.createdBy.name;

  // Create App record and link to GeneratedApp
  const app = await prisma.app.create({
    data: {
      title: manifest.name || submission.title || "Untitled",
      description: manifest.description || submission.description || "",
      category: manifest.category || "Other",
      icon: manifest.icon || "🚀",
      author,
      tags: JSON.stringify(manifest.tags || []),
      isPublic: true,
      generatedApp: { connect: { id: submission.id } },
    },
  });

  // Mark submission as complete
  await prisma.generatedApp.update({
    where: { id },
    data: { status: "COMPLETE" },
  });

  // Trigger preview deployment on builder (fire-and-forget)
  if (BUILDER_URL && submission.uploadBlobUrl) {
    fetch(`${BUILDER_URL}/deploy-preview`, {
      method: "POST",
      headers: builderHeaders(),
      body: JSON.stringify({ generationId: submission.id }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, appId: app.id });
}
