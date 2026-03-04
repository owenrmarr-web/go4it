import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import EstimateList from "./EstimateList";

export default async function EstimatesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const estimates = await prisma.estimate.findMany({
    where: { userId: session.user.id },
    include: { client: { select: { name: true } } },
    orderBy: { issueDate: "desc" },
  });

  // Auto-expire sent estimates past their expiration date
  const now = new Date();
  for (const est of estimates) {
    if (est.status === "SENT" && est.expiresAt && est.expiresAt < now) {
      await prisma.estimate.update({
        where: { id: est.id },
        data: { status: "EXPIRED" },
      });
      est.status = "EXPIRED";
    }
  }

  const serialized = estimates.map((e) => ({
    id: e.id,
    estimateNumber: e.estimateNumber,
    clientId: e.clientId,
    clientName: e.client.name,
    status: e.status,
    issueDate: e.issueDate.toISOString(),
    expiresAt: e.expiresAt?.toISOString() ?? null,
    total: e.total,
  }));

  return <EstimateList initialEstimates={serialized} />;
}
