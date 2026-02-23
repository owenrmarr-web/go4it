import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import ExpenseDetailClient from "@/components/ExpenseDetailClient";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  const expense = await prisma.expense.findFirst({
    where: { id, userId: session.user.id },
    include: {
      category: { select: { name: true } },
      client: { select: { name: true } },
    },
  });

  if (!expense) notFound();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <ExpenseDetailClient expense={JSON.parse(JSON.stringify(expense))} />
      </main>
    </div>
  );
}
