import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueSlug(title: string, userId: string): Promise<string> {
  const base = generateSlug(title) || "form";
  let slug = base;
  let i = 1;
  while (true) {
    const existing = await prisma.form.findFirst({ where: { userId, slug } });
    if (!existing) return slug;
    slug = `${base}-${i++}`;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const forms = await prisma.form.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { fields: true, submissions: true } } },
  });

  const result = await Promise.all(
    forms.map(async (form) => {
      const lastSub = await prisma.submission.findFirst({
        where: { formId: form.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      return {
        ...form,
        fieldCount: form._count.fields,
        submissionCount: form.submissionCount,
        lastSubmission: lastSub?.createdAt ?? null,
      };
    })
  );

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, description, type, requireName, requireEmail, allowMultiple } = body;

  if (!title?.trim())
    return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const slug = await uniqueSlug(title, session.user.id);

  const form = await prisma.form.create({
    data: {
      userId: session.user.id,
      title: title.trim(),
      description: description?.trim() || null,
      type: type || "FORM",
      status: "DRAFT",
      slug,
      requireName: requireName ?? true,
      requireEmail: requireEmail ?? true,
      allowMultiple: allowMultiple ?? false,
    },
  });

  return NextResponse.json(form, { status: 201 });
}
