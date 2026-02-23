import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import EstimateDetailClient from "@/components/EstimateDetailClient";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      category: { select: { name: true } },
    },
  });

  if (!estimate) notFound();

  const settings = await prisma.businessSettings.findFirst({
    where: { userId: session.user.id },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <EstimateDetailClient
          estimate={JSON.parse(JSON.stringify(estimate))}
          businessSettings={settings ? JSON.parse(JSON.stringify(settings)) : null}
        />
      </main>
    </div>
  );
}
