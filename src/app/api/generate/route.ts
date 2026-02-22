import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const BUILDER_URL = process.env.BUILDER_URL;
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

interface BusinessContext {
  businessContext?: string;
  companyName?: string;
  state?: string;
  country?: string;
  useCases?: string[];
}

async function callBuilder(path: string, body: Record<string, unknown>) {
  if (!BUILDER_URL) {
    throw new Error("BUILDER_URL not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (BUILDER_API_KEY) {
    headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;
  }

  const res = await fetch(`${BUILDER_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Builder service error: ${error}`);
  }

  return res.json();
}

export async function POST(request: Request) {
  // In local dev without BUILDER_URL, fall back to local generation
  if (!BUILDER_URL) {
    try {
      const { startGeneration } = await import("@/lib/generator");
      return handleLocalGeneration(request, startGeneration);
    } catch {
      return NextResponse.json(
        { error: "Builder service not configured and local generation unavailable" },
        { status: 503 }
      );
    }
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

  // Require username before generating — ensures creator attribution on publish
  const creator = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });
  if (!creator?.username) {
    return NextResponse.json(
      { error: "Please set a username before creating an app. Go to Account Settings or use the prompt on this page." },
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

    // Fetch user's org slug for auto-preview deployment
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } },
      include: { organization: { select: { slug: true } } },
    });

    // Delegate to builder service
    await callBuilder("/generate", {
      generationId: generatedApp.id,
      prompt: prompt.trim(),
      businessContext: context,
      userId: session.user.id,
      orgSlug: orgMember?.organization.slug,
    });

    return NextResponse.json({ id: generatedApp.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to start generation:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to start generation: ${message}` },
      { status: 500 }
    );
  }
}

// Local dev fallback — same as original behavior
async function handleLocalGeneration(
  request: Request,
  startGeneration: (id: string, prompt: string, context?: BusinessContext) => Promise<void>
) {
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

  // Require username before generating
  const creator = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });
  if (!creator?.username) {
    return NextResponse.json(
      { error: "Please set a username before creating an app. Go to Account Settings or use the prompt on this page." },
      { status: 400 }
    );
  }

  try {
    const generatedApp = await prisma.generatedApp.create({
      data: {
        prompt: prompt.trim(),
        createdById: session.user.id,
        status: "PENDING",
      },
    });

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
