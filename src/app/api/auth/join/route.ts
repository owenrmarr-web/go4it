import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { generateUsernameFromName } from "@/lib/username-utils";
import { validateUsername } from "@/lib/username";

export async function POST(request: Request) {
  try {
    const { token, name, password, username: requestedUsername, image, profileColor, profileEmoji } =
      await request.json();

    if (!token || !name?.trim()) {
      return NextResponse.json(
        { error: "Token and name are required" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "This invitation is no longer valid" },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Race condition guard
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Use requested username if provided, otherwise auto-generate from name
    let username = requestedUsername?.trim();
    if (username) {
      const usernameCheck = await validateUsername(username);
      if (!usernameCheck.valid) {
        return NextResponse.json(
          { error: usernameCheck.error },
          { status: 400 }
        );
      }
    } else {
      username = generateUsernameFromName(name.trim());
      if (username.length < 3) username = "user";
      const existingUsername = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (existingUsername) {
        username = `${username}_${Math.random().toString(36).substring(2, 6)}`;
      }
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: invitation.email,
          username,
          password: hashedPassword,
          emailVerified: new Date(),
          image: image || null,
          profileColor: profileColor || null,
          profileEmoji: profileEmoji || null,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });
    });

    return NextResponse.json({
      success: true,
      email: invitation.email,
    });
  } catch (error) {
    console.error("Join error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
