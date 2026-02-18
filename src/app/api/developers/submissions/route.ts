import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submissions = await prisma.generatedApp.findMany({
    where: {
      createdById: session.user.id,
      source: "uploaded",
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      manifestJson: true,
      appId: true,
      error: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(submissions);
}
