import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { put } from "@vercel/blob";
import { parseFile } from "@/lib/import-parser";

const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const orgSlug = formData.get("orgSlug") as string | null;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!orgSlug) {
      return NextResponse.json({ error: "orgSlug is required" }, { status: 400 });
    }

    // Validate file extension
    const ext = "." + (file.name.toLowerCase().split(".").pop() ?? "");
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File must be under 10MB" },
        { status: 400 }
      );
    }

    // OWNER/ADMIN check
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organization: { slug: orgSlug }, role: { in: ["OWNER", "ADMIN"] } },
      include: { organization: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Read and parse file
    const arrayBuffer = await file.arrayBuffer();
    const parsed = parseFile(arrayBuffer, file.name);

    // Upload to Vercel Blob
    const blobPath = `data-imports/${orgSlug}/${Date.now()}-${file.name}`;
    const blob = await put(blobPath, Buffer.from(arrayBuffer), { access: "public" });

    // Create ImportJob
    const importJob = await prisma.importJob.create({
      data: {
        organizationId: membership.organization.id,
        createdById: session.user.id,
        status: "UPLOADING",
        description: description || undefined,
      },
    });

    // Create ImportFile
    const importFile = await prisma.importFile.create({
      data: {
        importJobId: importJob.id,
        filename: file.name,
        blobUrl: blob.url,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        rowCount: parsed.totalRows,
        columns: JSON.stringify(parsed.columns),
        sampleData: JSON.stringify(parsed.sampleRows.slice(0, 50)),
      },
    });

    // Update job status to ANALYZING
    await prisma.importJob.update({
      where: { id: importJob.id },
      data: { status: "ANALYZING" },
    });

    return NextResponse.json({
      jobId: importJob.id,
      files: [
        {
          id: importFile.id,
          filename: importFile.filename,
          columns: parsed.columns,
          sampleRows: parsed.sampleRows.slice(0, 50),
          rowCount: parsed.totalRows,
        },
      ],
    });
  } catch (error) {
    console.error("Import upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
