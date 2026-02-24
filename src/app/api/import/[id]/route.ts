import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Load ImportJob with files
  const job = await prisma.importJob.findUnique({
    where: { id },
    include: { files: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Import job not found" }, { status: 404 });
  }

  // Verify user has membership in the job's organization
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id, organizationId: job.organizationId },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse JSON fields
  const analysis = job.analysisJson ? JSON.parse(job.analysisJson) : null;
  const confirmed = job.confirmedJson ? JSON.parse(job.confirmedJson) : null;
  const errors = job.errorsJson ? JSON.parse(job.errorsJson) : [];

  return NextResponse.json({
    id: job.id,
    status: job.status,
    description: job.description,
    totalRows: job.totalRows,
    importedRows: job.importedRows,
    skippedRows: job.skippedRows,
    errorRows: job.errorRows,
    errors,
    analysis,
    confirmed,
    files: job.files.map((f) => ({
      filename: f.filename,
      rowCount: f.rowCount,
      columns: f.columns ? JSON.parse(f.columns) : [],
    })),
    targetModel: job.targetModel,
    duplicateStrategy: job.duplicateStrategy,
    createdAt: job.createdAt,
  });
}
