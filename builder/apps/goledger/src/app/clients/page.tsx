import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import ClientsClient from "@/components/ClientsClient";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { invoices: true, expenses: true } },
    },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <ClientsClient clients={JSON.parse(JSON.stringify(clients))} />
      </main>
    </div>
  );
}
