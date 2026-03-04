import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SpacesClient from "./SpacesClient";

export default async function SpacesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const spaces = await prisma.space.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { pages: true } },
    },
  });

  return <SpacesClient spaces={JSON.parse(JSON.stringify(spaces))} />;
}
