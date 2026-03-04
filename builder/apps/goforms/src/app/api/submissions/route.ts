import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const formId = searchParams.get("formId");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (formId) where.formId = formId;
  if (status && status !== "ALL") where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      (where.createdAt as Record<string, unknown>).lt = toDate;
    }
  }

  let submissions = await prisma.submission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { form: { select: { title: true } } },
  });

  if (search) {
    const q = search.toLowerCase();
    submissions = submissions.filter(
      (s) =>
        s.respondentName?.toLowerCase().includes(q) ||
        s.respondentEmail?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json(
    submissions.map((s) => ({
      ...s,
      formTitle: s.form.title,
    }))
  );
}
