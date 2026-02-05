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

    console.log("Updating user with data keys:", Object.keys(updateData));

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

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
