import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { name: true, email: true } },
        milestone: { select: { name: true } },
        labels: { include: { label: { select: { name: true } } } },
      },
      orderBy: { position: "asc" },
    });

    // Build CSV
    const headers = ["Title", "Status", "Assignee", "Start Date", "Due Date", "Estimate", "Milestone", "Labels", "Created", "Updated"];
    const rows = tasks.map((t) => [
      escapeCsvField(t.title),
      escapeCsvField(t.status),
      escapeCsvField(t.assignee?.name || t.assignee?.email || ""),
      escapeCsvField(t.startDate ? t.startDate.toISOString().split("T")[0] : ""),
      escapeCsvField(t.dueDate ? t.dueDate.toISOString().split("T")[0] : ""),
      escapeCsvField(t.estimate?.toString() || ""),
      escapeCsvField(t.milestone?.name || ""),
      escapeCsvField(t.labels.map((l) => l.label.name).join("; ")),
      escapeCsvField(t.createdAt.toISOString().split("T")[0]),
      escapeCsvField(t.updatedAt.toISOString().split("T")[0]),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tasks-export.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
