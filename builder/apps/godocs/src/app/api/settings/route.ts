import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });

  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { defaultDocumentType, defaultExpirationDays, companyName, autoArchiveExpired } =
    await request.json();

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...(defaultDocumentType && { defaultDocumentType }),
      ...(defaultExpirationDays !== undefined && { defaultExpirationDays }),
      ...(companyName !== undefined && { companyName }),
      ...(autoArchiveExpired !== undefined && { autoArchiveExpired }),
    },
    update: {
      ...(defaultDocumentType !== undefined && { defaultDocumentType }),
      ...(defaultExpirationDays !== undefined && { defaultExpirationDays }),
      ...(companyName !== undefined && { companyName }),
      ...(autoArchiveExpired !== undefined && { autoArchiveExpired }),
    },
  });

  return NextResponse.json(settings);
}
