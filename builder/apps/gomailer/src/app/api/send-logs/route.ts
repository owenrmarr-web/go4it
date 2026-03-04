import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (search) {
    const lower = search.toLowerCase();
    where.OR = [
      { subscriberEmail: { contains: lower } },
      { subscriberName: { contains: lower } },
    ];
  }

  if (from || to) {
    const sentAtFilter: Record<string, unknown> = {};
    if (from) sentAtFilter.gte = new Date(from);
    if (to) sentAtFilter.lte = new Date(to + "T23:59:59.999Z");
    where.sentAt = sentAtFilter;
  }

  const logs = await prisma.sendLog.findMany({
    where,
    include: { campaign: { select: { name: true } } },
    orderBy: { sentAt: "desc" },
    take: 200,
  });
  return NextResponse.json(logs);
}
