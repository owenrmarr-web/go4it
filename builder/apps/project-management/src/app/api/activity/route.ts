import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Get user's project IDs
    const memberships = await prisma.projectMember.findMany({
      where: { userId: session.user.id },
      select: { projectId: true },
    });

    const projectIds = memberships.map((m) => m.projectId);

    const activities = await prisma.activity.findMany({
      where: {
        OR: [
          { projectId: { in: projectIds } },
          { userId: session.user.id },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("GET /api/activity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
