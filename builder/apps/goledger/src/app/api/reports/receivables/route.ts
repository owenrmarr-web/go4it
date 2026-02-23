import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Get all outstanding invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["SENT", "VIEWED", "PARTIAL", "OVERDUE"] },
    },
    include: {
      client: { select: { id: true, name: true } },
    },
  });

  // AR aging buckets
  const buckets = {
    current: { count: 0, total: 0, invoices: [] as typeof invoices },
    days1to30: { count: 0, total: 0, invoices: [] as typeof invoices },
    days31to60: { count: 0, total: 0, invoices: [] as typeof invoices },
    days61to90: { count: 0, total: 0, invoices: [] as typeof invoices },
    days90plus: { count: 0, total: 0, invoices: [] as typeof invoices },
  };

  for (const inv of invoices) {
    const outstanding = inv.total - inv.amountPaid;
    const dueDate = new Date(inv.dueDate);
    const diffMs = now.getTime() - dueDate.getTime();
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) {
      buckets.current.count++;
      buckets.current.total += outstanding;
      buckets.current.invoices.push(inv);
    } else if (daysOverdue <= 30) {
      buckets.days1to30.count++;
      buckets.days1to30.total += outstanding;
      buckets.days1to30.invoices.push(inv);
    } else if (daysOverdue <= 60) {
      buckets.days31to60.count++;
      buckets.days31to60.total += outstanding;
      buckets.days31to60.invoices.push(inv);
    } else if (daysOverdue <= 90) {
      buckets.days61to90.count++;
      buckets.days61to90.total += outstanding;
      buckets.days61to90.invoices.push(inv);
    } else {
      buckets.days90plus.count++;
      buckets.days90plus.total += outstanding;
      buckets.days90plus.invoices.push(inv);
    }
  }

  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + (inv.total - inv.amountPaid),
    0
  );

  // Format buckets as array with labels for the client
  const bucketsArray = [
    { label: "Current", count: buckets.current.count, total: buckets.current.total },
    { label: "1–30 Days", count: buckets.days1to30.count, total: buckets.days1to30.total },
    { label: "31–60 Days", count: buckets.days31to60.count, total: buckets.days31to60.total },
    { label: "61–90 Days", count: buckets.days61to90.count, total: buckets.days61to90.total },
    { label: "90+ Days", count: buckets.days90plus.count, total: buckets.days90plus.total },
  ];

  // Build overdue invoices list (everything past due date)
  const overdueInvoices = invoices
    .filter((inv) => {
      const dueDate = new Date(inv.dueDate);
      return now.getTime() > dueDate.getTime();
    })
    .map((inv) => {
      const dueDate = new Date(inv.dueDate);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client?.name ?? "Unknown",
        dueDate: inv.dueDate,
        total: inv.total,
        amountPaid: inv.amountPaid,
        daysOverdue,
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  return NextResponse.json({
    totalOutstanding,
    totalInvoices: invoices.length,
    buckets: bucketsArray,
    overdueInvoices,
  });
}
