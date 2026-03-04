import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ExpenseList from "./ExpenseList";

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const expenses = await prisma.expense.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });

  const serialized = expenses.map((e) => ({
    id: e.id,
    description: e.description,
    amount: e.amount,
    date: e.date.toISOString(),
    category: e.category,
    vendor: e.vendor,
    reference: e.reference,
    notes: e.notes,
    isReimbursable: e.isReimbursable,
    isReimbursed: e.isReimbursed,
  }));

  return <ExpenseList initialExpenses={serialized} />;
}
