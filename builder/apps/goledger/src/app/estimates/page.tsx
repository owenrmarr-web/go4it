import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import EstimatesClient from "@/components/EstimatesClient";

export default async function EstimatesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const estimates = await prisma.estimate.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { name: true } } },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <EstimatesClient estimates={JSON.parse(JSON.stringify(estimates))} />
      </main>
    </div>
  );
}
