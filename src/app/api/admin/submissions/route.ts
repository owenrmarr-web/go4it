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

  const submissions = await prisma.generatedApp.findMany({
    where: { source: "uploaded" },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      manifestJson: true,
      uploadBlobUrl: true,
      appId: true,
      error: true,
      createdAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(submissions);
}
