import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
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

  const generations = await prisma.generatedApp.findMany({
    select: {
      id: true,
      title: true,
      prompt: true,
      status: true,
      iterationCount: true,
      createdAt: true,
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      app: {
        select: { id: true, isGoSuite: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(generations);
}
