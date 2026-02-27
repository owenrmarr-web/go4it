import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jobId, duplicateStrategy } = body;

    if (!jobId || !duplicateStrategy) {
      return NextResponse.json(
        { error: "Missing required fields: jobId, duplicateStrategy" },
        { status: 400 }
      );
    }

    if (!["skip", "overwrite", "create_new"].includes(duplicateStrategy)) {
      return NextResponse.json(
        { error: "duplicateStrategy must be one of: skip, overwrite, create_new" },
        { status: 400 }
      );
    }

    // Load ImportJob
    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: "Import job not found" }, { status: 404 });
    }

    // Verify user has OWNER/ADMIN role in the job's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId: job.organizationId, role: { in: ["OWNER", "ADMIN"] } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Pull targetOrgAppId, targetModel, and mappings from stored analysis
    if (!job.analysisJson) {
      return NextResponse.json(
        { error: "Job has not been analyzed yet" },
        { status: 400 }
      );
    }

    if (!job.targetOrgAppId || !job.targetModel) {
      return NextResponse.json(
        { error: "Analysis did not resolve a target app. Please re-analyze." },
        { status: 400 }
      );
    }

    const analysis = JSON.parse(job.analysisJson);
    const primaryImport = analysis.imports?.[0];
    const mappings = primaryImport?.mappings ?? [];

    // Update ImportJob with confirmed mappings
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        confirmedJson: JSON.stringify({
          targetOrgAppId: job.targetOrgAppId,
          targetModel: job.targetModel,
          mappings,
          duplicateStrategy,
        }),
        duplicateStrategy,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Import confirm error:", error);
    return NextResponse.json(
      { error: "Failed to confirm mappings" },
      { status: 500 }
    );
  }
}
