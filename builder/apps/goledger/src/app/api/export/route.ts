import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!type || !["invoices", "payments", "expenses"].includes(type)) {
    return NextResponse.json(
      { error: "type must be invoices, payments, or expenses" },
      { status: 400 }
    );
  }

  const dateFilter: Record<string, unknown> = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate);
  }

  let csv = "";

  if (type === "invoices") {
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        ...(Object.keys(dateFilter).length > 0 && { issueDate: dateFilter }),
      },
      include: {
        client: { select: { name: true } },
      },
      orderBy: { issueDate: "desc" },
    });

    csv = "Invoice Number,Client,Status,Issue Date,Due Date,Subtotal,Tax,Total,Amount Paid,Balance\n";
    for (const inv of invoices) {
      csv += `"${inv.invoiceNumber}","${inv.client.name}","${inv.status}","${inv.issueDate.toISOString().split("T")[0]}","${inv.dueDate.toISOString().split("T")[0]}",${inv.subtotal.toFixed(2)},${inv.taxAmount.toFixed(2)},${inv.total.toFixed(2)},${inv.amountPaid.toFixed(2)},${(inv.total - inv.amountPaid).toFixed(2)}\n`;
    }
  } else if (type === "payments") {
    const payments = await prisma.payment.findMany({
      where: {
        userId: session.user.id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      include: {
        invoice: { select: { invoiceNumber: true } },
        client: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    csv = "Date,Client,Invoice,Amount,Method,Reference,Notes\n";
    for (const p of payments) {
      csv += `"${p.date.toISOString().split("T")[0]}","${p.client.name}","${p.invoice.invoiceNumber}",${p.amount.toFixed(2)},"${p.method}","${p.reference || ""}","${(p.notes || "").replace(/"/g, '""')}"\n`;
    }
  } else if (type === "expenses") {
    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      include: {
        category: { select: { name: true } },
        client: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    csv = "Date,Description,Category,Vendor,Client,Amount,Method,Billable,Reimbursable\n";
    for (const e of expenses) {
      csv += `"${e.date.toISOString().split("T")[0]}","${e.description.replace(/"/g, '""')}","${e.category?.name || ""}","${e.vendor || ""}","${e.client?.name || ""}",${e.amount.toFixed(2)},"${e.method || ""}","${e.isBillable ? "Yes" : "No"}","${e.isReimbursable ? "Yes" : "No"}"\n`;
    }
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${type}-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
