import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const formId = searchParams.get("formId");

  const userId = session.user.id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  if (formId) {
    // Per-form analytics
    const form = await prisma.form.findFirst({
      where: { id: formId, userId },
      include: { fields: { orderBy: { order: "asc" } } },
    });
    if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const submissions = await prisma.submission.findMany({
      where: { formId, userId },
      select: { id: true, createdAt: true },
    });

    // Submission timeline (last 30 days)
    const subsByDay: Record<string, number> = {};
    submissions.forEach((s) => {
      const key = s.createdAt.toISOString().split("T")[0];
      subsByDay[key] = (subsByDay[key] || 0) + 1;
    });

    const submissionsByDay = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      return { date: key, count: subsByDay[key] || 0 };
    });

    // Fetch all field responses for this form at once
    const allResponses = await prisma.fieldResponse.findMany({
      where: { submission: { formId, userId } },
      select: { fieldId: true, value: true },
    });

    const byField = new Map<string, string[]>();
    allResponses.forEach((r) => {
      if (!byField.has(r.fieldId)) byField.set(r.fieldId, []);
      byField.get(r.fieldId)!.push(r.value);
    });

    const fieldAnalytics = form.fields.map((field) => {
      const values = byField.get(field.id) || [];
      const base = {
        fieldId: field.id,
        label: field.label,
        fieldType: field.type,
        totalResponses: values.length,
      };

      switch (field.type) {
        case "NUMBER": {
          const nums = values.map(Number).filter((n) => !isNaN(n));
          return {
            ...base,
            min: nums.length ? Math.min(...nums) : 0,
            max: nums.length ? Math.max(...nums) : 0,
            avg: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0,
          };
        }
        case "RATING": {
          const ratings = values.map(Number).filter((n) => n >= 1 && n <= 5);
          const dist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
          ratings.forEach((r) => { dist[String(r)] = (dist[String(r)] || 0) + 1; });
          return {
            ...base,
            avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
            distribution: dist,
          };
        }
        case "SELECT":
        case "RADIO": {
          const opts: string[] = field.options ? JSON.parse(field.options) : [];
          const counts: Record<string, number> = {};
          opts.forEach((o) => { counts[o] = 0; });
          values.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
          return { ...base, optionCounts: counts };
        }
        case "MULTI_SELECT": {
          const opts: string[] = field.options ? JSON.parse(field.options) : [];
          const counts: Record<string, number> = {};
          opts.forEach((o) => { counts[o] = 0; });
          values.forEach((v) => {
            try {
              const arr: string[] = JSON.parse(v);
              arr.forEach((opt) => { counts[opt] = (counts[opt] || 0) + 1; });
            } catch { /* skip malformed */ }
          });
          return { ...base, optionCounts: counts };
        }
        case "CHECKBOX": {
          return {
            ...base,
            trueCount: values.filter((v) => v === "true").length,
            falseCount: values.filter((v) => v === "false").length,
          };
        }
        default:
          return base;
      }
    });

    return NextResponse.json({
      type: "form",
      form: { id: form.id, title: form.title, type: form.type, status: form.status },
      totalSubmissions: submissions.length,
      submissionsByDay,
      fieldAnalytics,
    });
  }

  // Cross-form summary
  const forms = await prisma.form.findMany({
    where: { userId },
    orderBy: { submissionCount: "desc" },
  });

  const recentSubs = await prisma.submission.findMany({
    where: { userId, createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const subsByDay: Record<string, number> = {};
  recentSubs.forEach((s) => {
    const key = s.createdAt.toISOString().split("T")[0];
    subsByDay[key] = (subsByDay[key] || 0) + 1;
  });

  const submissionsByDay = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    return { date: key, count: subsByDay[key] || 0 };
  });

  const formStats = await Promise.all(
    forms.map(async (f) => {
      const lastSub = await prisma.submission.findFirst({
        where: { formId: f.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      return {
        id: f.id,
        title: f.title,
        type: f.type,
        status: f.status,
        submissionCount: f.submissionCount,
        lastSubmission: lastSub?.createdAt ?? null,
      };
    })
  );

  const totalSubs = await prisma.submission.count({ where: { userId } });

  return NextResponse.json({
    type: "summary",
    totalForms: forms.length,
    activeForms: forms.filter((f) => f.status === "ACTIVE").length,
    totalSubmissions: totalSubs,
    submissionsByDay,
    formStats,
  });
}
