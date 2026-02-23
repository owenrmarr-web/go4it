import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import ExpensesClient from "@/components/ExpensesClient";

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const [expenses, categories] = await Promise.all([
    prisma.expense.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        client: { select: { name: true } },
      },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id, type: "EXPENSE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <ExpensesClient
          expenses={JSON.parse(JSON.stringify(expenses))}
          categories={categories}
        />
      </main>
    </div>
  );
}
