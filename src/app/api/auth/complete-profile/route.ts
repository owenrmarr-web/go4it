import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSlug, isReservedSlug } from "@/lib/slug";
import { validateUsername } from "@/lib/username";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, companyName, portalSlug, logo, themeColors, state, country, useCases, businessDescription } =
      await request.json();

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const usernameCheck = await validateUsername(username);
    if (!usernameCheck.valid) {
      return NextResponse.json({ error: usernameCheck.error }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user!.id },
        data: {
          username,
          companyName: companyName || null,
          logo: logo || null,
          themeColors: themeColors ? JSON.stringify(themeColors) : null,
          state: state || null,
          country: country || null,
          useCases: useCases ? JSON.stringify(useCases) : null,
          businessDescription: businessDescription || null,
        },
      });

      // Auto-create organization if company name provided
      if (companyName && companyName.trim()) {
        let slug: string;

        if (portalSlug) {
          if (portalSlug.length < 3 || portalSlug.length > 40) {
            throw new Error("Portal slug must be 3-40 characters");
          }
          if (!/^[a-z0-9-]+$/.test(portalSlug)) {
            throw new Error("Portal slug can only contain lowercase letters, numbers, and hyphens");
          }
          if (isReservedSlug(portalSlug)) {
            throw new Error("This portal URL is reserved");
          }
          const existingOrg = await tx.organization.findUnique({ where: { slug: portalSlug } });
          if (existingOrg) {
            throw new Error("This portal URL is already taken");
          }
          slug = portalSlug;
        } else {
          slug = generateSlug(companyName.trim());
          const existing = await tx.organization.findUnique({ where: { slug } });
          if (existing) {
            slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
          }
        }

        await tx.organization.create({
          data: {
            name: companyName.trim(),
            slug,
            logo: logo || null,
            themeColors: themeColors ? JSON.stringify(themeColors) : null,
            members: {
              create: { userId: session.user!.id as string, role: "OWNER" },
            },
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete profile error:", error);
    if (error instanceof Error && (
      error.message.includes("Portal slug") ||
      error.message.includes("portal URL")
    )) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
