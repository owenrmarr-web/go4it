import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { startGeneration, type BusinessContext } from "@/lib/generator";

export async function POST(request: Request) {
  // Generation requires Claude Code CLI + persistent filesystem (local dev only)
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "App generation is only available in local development. We're working on bringing this to go4it.live — stay tuned!" },
      { status: 503 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, businessContext: formContext } = await request.json();
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

    // Fetch user profile for business context enrichment
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        companyName: true,
        state: true,
        country: true,
        useCases: true,
        businessDescription: true,
      },
    });

    const context: BusinessContext = {
      businessContext: formContext || user?.businessDescription || undefined,
      companyName: user?.companyName || undefined,
      state: user?.state || undefined,
      country: user?.country || undefined,
      useCases: user?.useCases ? JSON.parse(user.useCases) : undefined,
    };

    // Start generation in the background (non-blocking)
    startGeneration(generatedApp.id, prompt.trim(), context).catch((err) => {
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
