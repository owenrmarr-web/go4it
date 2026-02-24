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
    const { jobId, targetOrgAppId, targetModel, mappings, duplicateStrategy } = body;

    if (!jobId || !targetOrgAppId || !targetModel || !mappings || !duplicateStrategy) {
      return NextResponse.json(
        { error: "Missing required fields: jobId, targetOrgAppId, targetModel, mappings, duplicateStrategy" },
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

    // Update ImportJob with confirmed mappings
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        confirmedJson: JSON.stringify({ targetOrgAppId, targetModel, mappings, duplicateStrategy }),
        targetOrgAppId,
        targetModel,
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
