import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

async function autoExpireDocuments(userId: string) {
  await prisma.document.updateMany({
    where: {
      userId,
      expiresAt: { lt: new Date() },
      status: { in: ["APPROVED", "SIGNED"] },
    },
    data: { status: "EXPIRED" },
  });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await autoExpireDocuments(session.user.id);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const folderId = searchParams.get("folderId");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") ?? "updatedAt";

  const where: Record<string, unknown> = { userId: session.user.id };
  if (status && status !== "ALL") where.status = status;
  if (type && type !== "ALL") where.type = type;
  if (folderId === "UNFILED") {
    where.folderId = null;
  } else if (folderId) {
    where.folderId = folderId;
  }
  if (search) {
    const q = search.toLowerCase();
    where.OR = [
      { title: { contains: q } },
      { clientName: { contains: q } },
      { description: { contains: q } },
    ];
  }

  const orderBy =
    sort === "title"
      ? { title: "asc" as const }
      : sort === "createdAt"
      ? { createdAt: "desc" as const }
      : { updatedAt: "desc" as const };

  const documents = await prisma.document.findMany({
    where,
    include: {
      folder: { select: { id: true, name: true } },
      versions: { select: { versionNumber: true }, orderBy: { versionNumber: "desc" }, take: 1 },
    },
    orderBy,
  });

  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, type, status, content, description, folderId, clientName, clientEmail, expiresAt } = body;

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const document = await prisma.document.create({
    data: {
      title,
      type: type ?? "OTHER",
      status: status ?? "DRAFT",
      content: content ?? "",
      description,
      folderId: folderId || null,
      clientName,
      clientEmail,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      userId: session.user.id,
    },
  });

  // Create initial version
  const version = await prisma.documentVersion.create({
    data: {
      versionNumber: 1,
      content: content ?? "",
      changeNotes: "Initial draft",
      authorId: session.user.id,
      documentId: document.id,
      userId: session.user.id,
    },
  });

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: { currentVersionId: version.id },
  });

  return NextResponse.json(updated, { status: 201 });
}
