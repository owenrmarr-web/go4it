import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

// GET /api/files/[id] — serve a file by its attachment id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Try channel file attachment first
  let attachment = await prisma.fileAttachment.findUnique({
    where: { id },
  });

  let filePath: string | null = null;
  let mimeType = "application/octet-stream";
  let filename = "file";

  if (attachment) {
    filePath = path.join(process.cwd(), attachment.path);
    mimeType = attachment.mimeType;
    filename = attachment.filename;
  } else {
    // Try DM file attachment
    const dmAttachment = await prisma.dMFileAttachment.findUnique({
      where: { id },
    });

    if (dmAttachment) {
      filePath = path.join(process.cwd(), dmAttachment.path);
      mimeType = dmAttachment.mimeType;
      filename = dmAttachment.filename;
    }
  }

  if (!filePath) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
