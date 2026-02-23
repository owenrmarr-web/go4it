import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

// PUT /api/profile — update profile (avatar image or color)
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // File upload for avatar
    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;
    const avatarColor = formData.get("avatarColor") as string | null;

    const updateData: Record<string, string | null> = {};

    if (avatarColor !== null) {
      updateData.avatarColor = avatarColor || null;
    }

    if (file) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
      }

      const uploadDir = path.join(process.cwd(), "uploads", "avatars");
      fs.mkdirSync(uploadDir, { recursive: true });

      const ext = path.extname(file.name) || ".png";
      const filename = `${session.user.id}${ext}`;
      const filePath = path.join(uploadDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      updateData.avatarUrl = `/api/profile/avatar/${session.user.id}${ext}`;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { id: true, avatarUrl: true, avatarColor: true },
    });

    return NextResponse.json(user);
  } else {
    // JSON body for color-only update or clearing avatar
    const body = await request.json();
    const { avatarColor, clearAvatar } = body;

    const updateData: Record<string, string | null> = {};

    if (avatarColor !== undefined) {
      updateData.avatarColor = avatarColor || null;
    }

    if (clearAvatar) {
      // Remove the avatar file if it exists
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { avatarUrl: true },
      });
      if (currentUser?.avatarUrl) {
        const avatarDir = path.join(process.cwd(), "uploads", "avatars");
        const files = fs.existsSync(avatarDir) ? fs.readdirSync(avatarDir) : [];
        for (const f of files) {
          if (f.startsWith(session.user.id)) {
            fs.unlinkSync(path.join(avatarDir, f));
          }
        }
      }
      updateData.avatarUrl = null;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { id: true, avatarUrl: true, avatarColor: true },
    });

    return NextResponse.json(user);
  }
}
