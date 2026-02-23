import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ExportClient from "@/components/ExportClient";

export default async function ExportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <ExportClient />
      </main>
    </div>
  );
}
