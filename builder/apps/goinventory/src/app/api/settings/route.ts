import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, title: true },
  });

  return NextResponse.json({
    warehouseName: user?.title || "",
    defaultUnit: "each",
    lowStockMultiplier: 1,
    userName: user?.name || "",
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      title: data.warehouseName || null,
    },
  });

  return NextResponse.json({ success: true });
}
