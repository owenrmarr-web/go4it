import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

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

  if (generatedApp.appId) {
    return NextResponse.json(
      { error: "This app has already been published" },
      { status: 409 }
    );
  }

  // Create the marketplace App record and link it
  const app = await prisma.app.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      icon: icon || "🚀",
      author: session.user.name || session.user.email || "Community",
      tags: JSON.stringify([]),
      isPublic: isPublic !== false,
    },
  });

  await prisma.generatedApp.update({
    where: { id },
    data: { appId: app.id },
  });

  return NextResponse.json({ appId: app.id }, { status: 201 });
}
