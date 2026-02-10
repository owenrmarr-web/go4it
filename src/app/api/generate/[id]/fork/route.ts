import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { existsSync } from "fs";
import { cp } from "fs/promises";
import path from "path";

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
  });

  if (!generatedApp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (generatedApp.status !== "COMPLETE") {
    return NextResponse.json(
      { error: "Can only fork a completed app" },
      { status: 409 }
    );
  }

  if (!generatedApp.sourceDir || !existsSync(generatedApp.sourceDir)) {
    return NextResponse.json(
      { error: "Source code not available for forking" },
      { status: 400 }
    );
  }

  // Create the forked GeneratedApp record first (to get the ID for the directory)
  const forkedApp = await prisma.generatedApp.create({
    data: {
      prompt: generatedApp.prompt,
      title: generatedApp.title,
      description: generatedApp.description,
      status: "COMPLETE",
      createdById: session.user.id,
      marketplaceVersion: generatedApp.marketplaceVersion,
      forkedFromId: generatedApp.id,
      iterationCount: 0,
    },
  });

  // Copy source directory to new location
  const appsRoot = path.resolve(process.cwd(), "apps");
  const newSourceDir = path.join(appsRoot, forkedApp.id);

  try {
    await cp(generatedApp.sourceDir, newSourceDir, { recursive: true });
  } catch (err) {
    // Clean up the DB record if copy fails
    await prisma.generatedApp.delete({ where: { id: forkedApp.id } });
    throw err;
  }

  // Update with the new source directory
  await prisma.generatedApp.update({
    where: { id: forkedApp.id },
    data: { sourceDir: newSourceDir },
  });

  return NextResponse.json({
    id: forkedApp.id,
    forkedFromId: generatedApp.id,
  }, { status: 201 });
}
