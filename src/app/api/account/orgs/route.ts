import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const ROLE_PRIORITY: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          themeColors: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  // Sort OWNER first, then ADMIN, then MEMBER, then by joinedAt
  const sorted = memberships.sort(
    (a, b) =>
      (ROLE_PRIORITY[a.role] ?? 9) - (ROLE_PRIORITY[b.role] ?? 9) ||
      new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  );

  const orgs = sorted.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    logo: m.organization.logo,
    themeColors: m.organization.themeColors
      ? JSON.parse(m.organization.themeColors)
      : null,
    role: m.role,
  }));

  return NextResponse.json(orgs);
}
