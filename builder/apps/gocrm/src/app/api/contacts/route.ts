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
  const stage = searchParams.get("stage");
  const companyId = searchParams.get("companyId");
  const tagId = searchParams.get("tagId");
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") || "desc";

  const where: Record<string, unknown> = { userId: session.user.id };

  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
    ];
  }

  if (stage) {
    where.stage = stage;
  }

  if (companyId) {
    where.companyId = companyId;
  }

  if (tagId) {
    where.contactTags = { some: { tagId } };
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      company: { select: { id: true, name: true } },
      contactTags: { include: { tag: true } },
    },
    orderBy: { [sort]: order },
  });

  return NextResponse.json(contacts);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.firstName || !body.lastName) {
    return NextResponse.json(
      { error: "firstName and lastName are required" },
      { status: 400 }
    );
  }

  const contact = await prisma.contact.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email || null,
      phone: body.phone || null,
      mobilePhone: body.mobilePhone || null,
      jobTitle: body.jobTitle || null,
      stage: body.stage || "LEAD",
      source: body.source || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip || null,
      notes: body.notes || null,
      companyId: body.companyId || null,
      userId: session.user.id,
    },
    include: {
      company: { select: { id: true, name: true } },
      contactTags: { include: { tag: true } },
    },
  });

  return NextResponse.json(contact, { status: 201 });
}
