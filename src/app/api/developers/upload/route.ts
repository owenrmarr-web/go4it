import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { put } from "@vercel/blob";
import JSZip from "jszip";

const VALID_CATEGORIES = [
  "CRM / Sales",
  "Project Management",
  "Invoicing / Finance",
  "Internal Chat",
  "HR / People",
  "Inventory",
  "Scheduling / Bookings",
  "Customer Support",
  "Marketing / Analytics",
  "Business Planning",
  "Compliance / Legal",
  "Document Management",
  "Other",
];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "File must be a .zip archive" },
        { status: 400 }
      );
    }

    // 25MB limit
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be under 25MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find go4it.json (could be at root or inside a top-level folder)
    let manifestFile = zip.file("go4it.json");
    if (!manifestFile) {
      // Check inside first directory (e.g., my-app/go4it.json)
      const entries = Object.keys(zip.files);
      const nested = entries.find(
        (e) => e.match(/^[^/]+\/go4it\.json$/) && !zip.files[e].dir
      );
      if (nested) manifestFile = zip.file(nested);
    }

    if (!manifestFile) {
      return NextResponse.json(
        {
          error:
            "Missing go4it.json manifest. Your app must include a go4it.json file in the project root.",
        },
        { status: 400 }
      );
    }

    const manifestText = await manifestFile.async("text");
    let manifest: {
      name?: string;
      description?: string;
      category?: string;
      icon?: string;
      tags?: string[];
    };
    try {
      manifest = JSON.parse(manifestText);
    } catch {
      return NextResponse.json(
        { error: "go4it.json is not valid JSON" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!manifest.name || typeof manifest.name !== "string") {
      return NextResponse.json(
        { error: 'go4it.json must have a "name" field (string)' },
        { status: 400 }
      );
    }
    if (
      !manifest.description ||
      typeof manifest.description !== "string" ||
      manifest.description.length < 10
    ) {
      return NextResponse.json(
        {
          error:
            'go4it.json must have a "description" field (minimum 10 characters)',
        },
        { status: 400 }
      );
    }
    if (!manifest.category || !VALID_CATEGORIES.includes(manifest.category)) {
      return NextResponse.json(
        {
          error: `go4it.json "category" must be one of: ${VALID_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    if (!manifest.icon || typeof manifest.icon !== "string") {
      return NextResponse.json(
        { error: 'go4it.json must have an "icon" field (single emoji)' },
        { status: 400 }
      );
    }
    if (!Array.isArray(manifest.tags) || manifest.tags.length === 0) {
      return NextResponse.json(
        { error: 'go4it.json must have a "tags" array with at least one tag' },
        { status: 400 }
      );
    }

    // Upload zip to Vercel Blob
    const blob = await put(
      `developer-uploads/${Date.now()}-${file.name}`,
      Buffer.from(arrayBuffer),
      { access: "public" }
    );

    // Create GeneratedApp record
    const generatedApp = await prisma.generatedApp.create({
      data: {
        prompt: manifest.description,
        title: manifest.name,
        description: manifest.description,
        status: "PENDING",
        source: "uploaded",
        uploadBlobUrl: blob.url,
        manifestJson: manifestText,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ success: true, id: generatedApp.id });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
