import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import SettingsClient from "@/components/SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const [settings, categories] = await Promise.all([
    prisma.businessSettings.findFirst({ where: { userId: session.user.id } }),
    prisma.category.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <SettingsClient
          settings={settings ? JSON.parse(JSON.stringify(settings)) : null}
          categories={JSON.parse(JSON.stringify(categories))}
        />
      </main>
    </div>
  );
}
