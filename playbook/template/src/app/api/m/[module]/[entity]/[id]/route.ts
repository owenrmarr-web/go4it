import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEntity } from "@/lib/modules";
import {
  getEntity as getRecord,
  updateEntity,
  deleteEntity,
} from "@/lib/crud";

type Params = Promise<{ module: string; entity: string; id: string }>;

// GET /api/m/:module/:entity/:id — get single entity
export async function GET(req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { module: moduleId, entity: entitySlug, id } = await params;
  const resolved = getEntity(moduleId, entitySlug);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const record = await getRecord(resolved.entity, id);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(record);
}

// PUT /api/m/:module/:entity/:id — update entity
export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { module: moduleId, entity: entitySlug, id } = await params;
  const resolved = getEntity(moduleId, entitySlug);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();

  try {
    const record = await updateEntity(resolved.entity, id, body);
    return NextResponse.json(record);
  } catch (err) {
    console.error("Update failed:", err);
    return NextResponse.json(
      { error: "Failed to update record" },
      { status: 500 }
    );
  }
}

// DELETE /api/m/:module/:entity/:id — delete entity
export async function DELETE(
  req: NextRequest,
  { params }: { params: Params }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { module: moduleId, entity: entitySlug, id } = await params;
  const resolved = getEntity(moduleId, entitySlug);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await deleteEntity(resolved.entity, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete failed:", err);
    return NextResponse.json(
      { error: "Failed to delete record" },
      { status: 500 }
    );
  }
}
