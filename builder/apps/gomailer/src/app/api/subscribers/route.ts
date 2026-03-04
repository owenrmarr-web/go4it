import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const listId = searchParams.get("listId");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (listId) where.listId = listId;

  const subscribers = await prisma.subscriber.findMany({
    where,
    include: { list: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(subscribers);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Bulk add support
  if (body.emails && Array.isArray(body.emails)) {
    const results = { added: 0, skipped: 0 };
    for (const email of body.emails) {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) continue;
      try {
        await prisma.subscriber.create({
          data: {
            email: trimmed,
            status: "ACTIVE",
            listId: body.listId,
            userId: session.user.id,
          },
        });
        results.added++;
      } catch {
        results.skipped++;
      }
    }
    return NextResponse.json(results, { status: 201 });
  }

  // Single add
  try {
    const subscriber = await prisma.subscriber.create({
      data: {
        email: body.email.trim().toLowerCase(),
        name: body.name || null,
        status: "ACTIVE",
        listId: body.listId,
        userId: session.user.id,
      },
    });
    return NextResponse.json(subscriber, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Subscriber already exists in this list" },
      { status: 409 }
    );
  }
}
