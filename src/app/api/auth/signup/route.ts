import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { generateSlug, isReservedSlug } from "@/lib/slug";
import { validateUsername } from "@/lib/username";

export async function POST(request: Request) {
  try {
    const { name, email, password, username, companyName, portalSlug, logo, themeColors, state, country, useCases, businessDescription } =
      await request.json();

    if (!name || !email || !password || !username) {
      return NextResponse.json(
        { error: "Name, email, password, and username are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const usernameCheck = await validateUsername(username);
    if (!usernameCheck.valid) {
      return NextResponse.json(
        { error: usernameCheck.error },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          username,
          password: hashedPassword,
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
          // Validate custom slug
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
              create: { userId: user.id, role: "OWNER" },
            },
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup error:", error);
    if (error instanceof Error && (
      error.message.includes("Portal slug") ||
      error.message.includes("portal URL")
    )) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
