import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/settings/closures — List all closures
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const closures = await prisma.businessClosure.findMany({
    orderBy: { date: "asc" },
  });

  return NextResponse.json(closures);
}

// POST /api/settings/closures — Create closure(s)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Accept single { date, reason } or array
  const entries: { date: string; reason?: string }[] = Array.isArray(body) ? body : [body];

  if (entries.length === 0 || !entries.every((e) => e.date)) {
    return NextResponse.json({ error: "Each entry requires a date" }, { status: 400 });
  }

  const created = await prisma.$transaction(
    entries.map((entry) =>
      prisma.businessClosure.upsert({
        where: { date: entry.date },
        update: { reason: entry.reason || null },
        create: { date: entry.date, reason: entry.reason || null },
      })
    )
  );

  return NextResponse.json(created, { status: 201 });
}
