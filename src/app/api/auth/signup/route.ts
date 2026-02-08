import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";

export async function POST(request: Request) {
  try {
    const { name, email, password, companyName, state, country, useCases, businessDescription } =
      await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
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
          password: hashedPassword,
          companyName: companyName || null,
          state: state || null,
          country: country || null,
          useCases: useCases ? JSON.stringify(useCases) : null,
          businessDescription: businessDescription || null,
        },
      });

      // Auto-create organization if company name provided
      if (companyName && companyName.trim()) {
        let slug = generateSlug(companyName.trim());
        const existing = await tx.organization.findUnique({
          where: { slug },
        });
        if (existing) {
          slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
        }

        await tx.organization.create({
          data: {
            name: companyName.trim(),
            slug,
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
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
