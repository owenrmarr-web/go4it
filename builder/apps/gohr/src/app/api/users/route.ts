import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      profileColor: true,
      profileEmoji: true,
      isAssigned: true,
      employeeProfile: { select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
