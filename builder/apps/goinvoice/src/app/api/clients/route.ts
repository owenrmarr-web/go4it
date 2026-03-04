import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    include: {
      invoices: { select: { total: true, amountPaid: true, status: true } },
    },
    orderBy: { name: "asc" },
  });

  const enriched = clients.map((c) => ({
    ...c,
    invoiceCount: c.invoices.length,
    totalBilled: c.invoices.reduce((s, i) => s + i.total, 0),
    totalPaid: c.invoices.reduce((s, i) => s + i.amountPaid, 0),
    outstanding: c.invoices
      .filter((i) => i.status !== "CANCELLED")
      .reduce((s, i) => s + (i.total - i.amountPaid), 0),
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const client = await prisma.client.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip || null,
      notes: body.notes || null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
