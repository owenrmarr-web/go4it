import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEntity } from "@/lib/modules";
import { listEntities, createEntity } from "@/lib/crud";

// GET /api/m/:module/:entity — list entities
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ module: string; entity: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { module: moduleId, entity: entitySlug } = await params;
  const resolved = getEntity(moduleId, entitySlug);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const search = req.nextUrl.searchParams.get("search") || undefined;
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
  const take = 25;
  const skip = (page - 1) * take;

  const data = await listEntities(resolved.entity, { search, take, skip });
  return NextResponse.json(data);
}

// POST /api/m/:module/:entity — create entity
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ module: string; entity: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { module: moduleId, entity: entitySlug } = await params;
  const resolved = getEntity(moduleId, entitySlug);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  // Attach userId for ownership tracking
  body.userId = session.user.id;

  try {
    const record = await createEntity(resolved.entity, body);
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error("Create failed:", err);
    return NextResponse.json(
      { error: "Failed to create record" },
      { status: 500 }
    );
  }
}
