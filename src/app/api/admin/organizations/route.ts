import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          members: true,
          apps: true,
          invitations: true,
        },
      },
      members: {
        where: { role: "OWNER" },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = organizations.map((org) => ({
    ...org,
    owner: org.members[0]?.user ?? null,
    members: undefined,
  }));

  return NextResponse.json(result);
}
