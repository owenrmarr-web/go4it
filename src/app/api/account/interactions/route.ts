import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const interactions = await prisma.userInteraction.findMany({
    where: { userId: session.user.id },
    include: { app: true },
  });

  const hearts = interactions
    .filter((i) => i.type === "HEART")
    .map((i) => i.app);
  const stars = interactions
    .filter((i) => i.type === "STAR")
    .map((i) => i.app);

  return NextResponse.json({ hearts, stars });
}
