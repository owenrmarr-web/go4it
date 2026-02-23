import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import EstimateFormClient from "@/components/EstimateFormClient";

export default async function NewEstimatePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;

  const [clients, categories, settings] = await Promise.all([
    prisma.client.findMany({
      where: { userId, role: { in: ["CUSTOMER", "BOTH"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { userId, type: "INCOME" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.businessSettings.findFirst({ where: { userId } }),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <EstimateFormClient
          clients={clients}
          categories={categories}
          taxRate={settings?.taxRate ?? 0}
          nextNumber={`${settings?.estimatePrefix ?? "EST"}-${String(settings?.nextEstimateNumber ?? 1).padStart(4, "0")}`}
        />
      </main>
    </div>
  );
}
