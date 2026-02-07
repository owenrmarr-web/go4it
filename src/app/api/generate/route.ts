import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { startGeneration } from "@/lib/generator";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt } = await request.json();
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

  try {
    // Create the generation record
    const generatedApp = await prisma.generatedApp.create({
      data: {
        prompt: prompt.trim(),
        createdById: session.user.id,
        status: "PENDING",
      },
    });

    // Start generation in the background (non-blocking)
    startGeneration(generatedApp.id, prompt.trim()).catch((err) => {
      console.error(`Generation failed for ${generatedApp.id}:`, err);
    });

    return NextResponse.json({ id: generatedApp.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to start generation:", error);
    return NextResponse.json(
      { error: "Failed to start generation" },
      { status: 500 }
    );
  }
}
