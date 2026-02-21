import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const BUILDER_URL = process.env.BUILDER_URL;
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const generatedApp = await prisma.generatedApp.findUnique({
    where: { id },
    select: { createdById: true, status: true },
  });

  if (!generatedApp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (generatedApp.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Tell the builder to kill the CLI process
  if (BUILDER_URL) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (BUILDER_API_KEY) {
        headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;
      }

      await fetch(`${BUILDER_URL}/cancel`, {
        method: "POST",
        headers,
        body: JSON.stringify({ generationId: id }),
      });
    } catch (err) {
      console.error("Failed to cancel on builder:", err);
    }
  }

  // Also mark as failed in the platform DB (in case builder is unreachable)
  if (generatedApp.status === "GENERATING" || generatedApp.status === "PENDING") {
    await prisma.generatedApp.update({
      where: { id },
      data: { status: "FAILED", currentStage: "failed", error: "Cancelled by user" },
    });
  }

  return NextResponse.json({ status: "cancelled" });
}
