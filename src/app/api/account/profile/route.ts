import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";
import { validateUsername } from "@/lib/username";

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
      username: true,
      email: true,
      companyName: true,
      state: true,
      country: true,
      useCases: true,
      businessDescription: true,
      logo: true,
      image: true,
      themeColors: true,
      profileColor: true,
      profileEmoji: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let themeColors = user.themeColors ? JSON.parse(user.themeColors) : null;

  // Fall back to org theme colors if user has no custom theme
  if (!themeColors) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: { select: { themeColors: true } } },
    });
    if (membership?.organization.themeColors) {
      themeColors = JSON.parse(membership.organization.themeColors);
    }
  }

  return NextResponse.json({
    ...user,
    useCases: user.useCases ? JSON.parse(user.useCases) : [],
    themeColors,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, username, companyName, state, country, useCases, logo, themeColors, businessDescription, image, profileColor, profileEmoji } =
      body;

    // Build update object with only defined fields
    const updateData: {
      name?: string;
      username?: string;
      companyName?: string | null;
      state?: string | null;
      country?: string | null;
      useCases?: string | null;
      logo?: string | null;
      themeColors?: string | null;
      businessDescription?: string | null;
      image?: string | null;
      profileColor?: string | null;
      profileEmoji?: string | null;
    } = {};

    // Validate and update username if provided
    if (username !== undefined) {
      const usernameCheck = await validateUsername(username, session.user.id);
      if (!usernameCheck.valid) {
        return NextResponse.json(
          { error: usernameCheck.error },
          { status: 400 }
        );
      }
      updateData.username = username;
    }

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
    if (businessDescription !== undefined)
      updateData.businessDescription = businessDescription || null;
    if (image !== undefined) updateData.image = image || null;
    if (profileColor !== undefined)
      updateData.profileColor = profileColor || null;
    if (profileEmoji !== undefined)
      updateData.profileEmoji = profileEmoji || null;

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
