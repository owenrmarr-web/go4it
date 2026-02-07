import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
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
    select: {
      status: true,
      title: true,
      description: true,
      error: true,
      iterationCount: true,
      appId: true,
      createdById: true,
    },
  });

  if (!generatedApp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (generatedApp.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    status: generatedApp.status,
    title: generatedApp.title,
    description: generatedApp.description,
    error: generatedApp.error,
    iterationCount: generatedApp.iterationCount,
    appId: generatedApp.appId,
  });
}
