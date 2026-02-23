import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.toLowerCase() || "";

  const where: Record<string, unknown> = { userId: session.user.id };

  if (q) {
    where.name = { contains: q };
  }

  const companies = await prisma.company.findMany({
    where,
    include: {
      _count: { select: { contacts: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(companies);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const company = await prisma.company.create({
    data: {
      name: body.name,
      industry: body.industry || null,
      website: body.website || null,
      phone: body.phone || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip || null,
      notes: body.notes || null,
      userId: session.user.id,
    },
    include: {
      _count: { select: { contacts: true } },
    },
  });

  return NextResponse.json(company, { status: 201 });
}
