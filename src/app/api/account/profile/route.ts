import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      state: true,
      country: true,
      useCases: true,
      logo: true,
      themeColors: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...user,
    useCases: user.useCases ? JSON.parse(user.useCases) : [],
    themeColors: user.themeColors ? JSON.parse(user.themeColors) : null,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, companyName, state, country, useCases, logo, themeColors } =
      body;

    // Build update object with only defined fields
    const updateData: {
      name?: string;
      companyName?: string | null;
      state?: string | null;
      country?: string | null;
      useCases?: string | null;
      logo?: string | null;
      themeColors?: string | null;
    } = {};

    // Only update fields that were provided
    if (name) updateData.name = name;
    if (companyName !== undefined)
      updateData.companyName = companyName || null;
    if (state !== undefined) updateData.state = state || null;
    if (country !== undefined) updateData.country = country || null;
    if (useCases !== undefined)
      updateData.useCases =
        Array.isArray(useCases) && useCases.length > 0
          ? JSON.stringify(useCases)
          : null;
    if (logo !== undefined) updateData.logo = logo || null;
    if (themeColors !== undefined)
      updateData.themeColors = themeColors
        ? JSON.stringify(themeColors)
        : null;

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    // Sync org branding or create org if needed
    const trimmedCompany = companyName?.trim();
    if (trimmedCompany) {
      const ownerMembership = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id, role: "OWNER" },
        include: { organization: true },
      });

      if (ownerMembership) {
        // Sync org name, logo, and theme colors
        const orgUpdate: { name?: string; logo?: string | null; themeColors?: string | null } = {};
        orgUpdate.name = trimmedCompany;
        if (logo !== undefined) orgUpdate.logo = logo || null;
        if (themeColors !== undefined)
          orgUpdate.themeColors = themeColors ? JSON.stringify(themeColors) : null;

        await prisma.organization.update({
          where: { id: ownerMembership.organizationId },
          data: orgUpdate,
        });
      } else {
        // No org yet — create one (lazy org creation)
        let slug = generateSlug(trimmedCompany);
        const existing = await prisma.organization.findUnique({
          where: { slug },
        });
        if (existing) {
          slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
        }

        await prisma.organization.create({
          data: {
            name: trimmedCompany,
            slug,
            logo: logo || null,
            themeColors: themeColors ? JSON.stringify(themeColors) : null,
            members: {
              create: { userId: session.user.id, role: "OWNER" },
            },
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Profile update error:", errorMessage, error);
    return NextResponse.json(
      { error: `Failed to update profile: ${errorMessage}` },
      { status: 500 }
    );
  }
}
