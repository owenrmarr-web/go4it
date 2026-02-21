import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { put } from "@vercel/blob";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const bugs = await prisma.bugReport.findMany({
    where: status ? { status: status as "OPEN" | "IN_PROGRESS" | "FIXED" | "WONTFIX" } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bugs);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const reporterName = formData.get("reporterName") as string;
    const location = formData.get("location") as string | null;
    const description = formData.get("description") as string;
    const stepsToReproduce = formData.get("stepsToReproduce") as string | null;
    const screenshot = formData.get("screenshot") as File | null;

    if (!reporterName?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!description?.trim() || description.trim().length < 10) {
      return NextResponse.json({ error: "Description must be at least 10 characters" }, { status: 400 });
    }

    let screenshotUrl: string | null = null;
    if (screenshot && screenshot.size > 0) {
      if (screenshot.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Screenshot must be under 5MB" }, { status: 400 });
      }
      const blob = await put(
        `bug-screenshots/${Date.now()}-${screenshot.name}`,
        Buffer.from(await screenshot.arrayBuffer()),
        { access: "public" }
      );
      screenshotUrl = blob.url;
    }

    const bug = await prisma.bugReport.create({
      data: {
        reporterName: reporterName.trim(),
        location: location?.trim() || null,
        description: description.trim(),
        stepsToReproduce: stepsToReproduce?.trim() || null,
        screenshotUrl,
      },
    });

    return NextResponse.json(bug, { status: 201 });
  } catch (error) {
    console.error("Bug report error:", error);
    return NextResponse.json({ error: "Failed to create bug report" }, { status: 500 });
  }
}
