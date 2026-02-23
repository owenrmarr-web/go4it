import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const role = searchParams.get("role");
  const q = searchParams.get("q")?.toLowerCase() || "";

  const where: Record<string, unknown> = { userId: session.user.id };

  if (role) {
    where.role = role;
  }

  const clients = await prisma.client.findMany({
    where,
    orderBy: { name: "asc" },
  });

  if (q) {
    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(q) ||
        (client.email && client.email.toLowerCase().includes(q)) ||
        (client.contactName && client.contactName.toLowerCase().includes(q))
    );
    return NextResponse.json(filtered);
  }

  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const client = await prisma.client.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      type: body.type || "BUSINESS",
      role: body.role || "CUSTOMER",
      contactName: body.contactName || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip || null,
      paymentTerms: body.paymentTerms || null,
      notes: body.notes || null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
