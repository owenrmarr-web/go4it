import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { startIteration } from "@/lib/generator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { prompt } = body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 10) {
    return NextResponse.json(
      { error: "Prompt must be at least 10 characters" },
      { status: 400 }
    );
  }

  if (prompt.length > 5000) {
    return NextResponse.json(
      { error: "Prompt must be under 5000 characters" },
      { status: 400 }
    );
  }

  const generatedApp = await prisma.generatedApp.findUnique({
    where: { id },
  });

  if (!generatedApp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (generatedApp.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (generatedApp.status !== "COMPLETE" && generatedApp.status !== "FAILED") {
    return NextResponse.json(
      { error: "App must be fully generated before iterating" },
      { status: 409 }
    );
  }

  const nextSeq = generatedApp.iterationCount + 1;

  const iteration = await prisma.appIteration.create({
    data: {
      generatedAppId: id,
      prompt: prompt.trim(),
      sequenceNumber: nextSeq,
      status: "PENDING",
    },
  });

  await prisma.generatedApp.update({
    where: { id },
    data: {
      status: "GENERATING",
      iterationCount: nextSeq,
    },
  });

  startIteration(id, iteration.id, prompt.trim()).catch((err) => {
    console.error(`Iteration failed for ${id}/${iteration.id}:`, err);
  });

  return NextResponse.json({ iterationId: iteration.id }, { status: 201 });
}
