import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import AnnouncementsClient from "./AnnouncementsClient";

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const announcements = await prisma.announcement.findMany({
    where: { userId: session.user.id },
    orderBy: [{ pinned: "desc" }, { publishDate: "desc" }],
  });

  return (
    <AnnouncementsClient
      announcements={JSON.parse(JSON.stringify(announcements))}
    />
  );
}
