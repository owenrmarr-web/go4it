import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const BUILDER_URL = process.env.BUILDER_URL;
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

/** Best-effort cleanup of builder workspace after publish */
function cleanupBuilderWorkspace(generationId: string) {
  if (!BUILDER_URL) return;
  const headers: Record<string, string> = {};
  if (BUILDER_API_KEY) headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;
  fetch(`${BUILDER_URL}/workspace/${generationId}`, {
    method: "DELETE",
    headers,
  }).catch(() => {});
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

  let body: {
    title?: string;
    description?: string;
    category?: string;
    icon?: string;
    isPublic?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, description, category, icon, isPublic } = body;

  if (!title || title.trim().length < 2) {
    return NextResponse.json(
      { error: "Title must be at least 2 characters" },
      { status: 400 }
    );
  }

  if (!description || description.trim().length < 10) {
    return NextResponse.json(
      { error: "Description must be at least 10 characters" },
      { status: 400 }
    );
  }

  if (!category) {
    return NextResponse.json(
      { error: "Category is required" },
      { status: 400 }
    );
  }

  const generatedApp = await prisma.generatedApp.findUnique({
    where: { id },
  });

  if (!generatedApp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (generatedApp.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (generatedApp.status !== "COMPLETE") {
    return NextResponse.json(
      { error: "App must be fully generated before publishing" },
      { status: 409 }
    );
  }

  // Re-publish: update existing App record and bump marketplace version
  // This also handles the case where an App was auto-created during preview deploy
  if (generatedApp.appId) {
    // Get creator's username for author field (auto-created records may have userId as author)
    const creator = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, name: true, email: true },
    });
    const authorDisplay = creator?.username
      ? `@${creator.username}`
      : creator?.name || creator?.email || "Community";

    const updatedApp = await prisma.app.update({
      where: { id: generatedApp.appId },
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        icon: icon || "🚀",
        author: authorDisplay,
        isPublic: isPublic !== false,
      },
    });

    const updatedGen = await prisma.generatedApp.update({
      where: { id },
      data: { marketplaceVersion: { increment: 1 } },
    });

    cleanupBuilderWorkspace(id);

    return NextResponse.json({
      appId: updatedApp.id,
      marketplaceVersion: updatedGen.marketplaceVersion,
      republished: true,
    });
  }

  // Get creator's username for author field
  const creator = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, name: true, email: true },
  });
  const authorDisplay = creator?.username
    ? `@${creator.username}`
    : creator?.name || creator?.email || "Community";

  // First publish: create the marketplace App record and link it
  const app = await prisma.app.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      icon: icon || "🚀",
      author: authorDisplay,
      tags: JSON.stringify([]),
      isPublic: isPublic !== false,
    },
  });

  await prisma.generatedApp.update({
    where: { id },
    data: { appId: app.id },
  });

  cleanupBuilderWorkspace(id);

  return NextResponse.json({ appId: app.id, marketplaceVersion: 1 }, { status: 201 });
}
