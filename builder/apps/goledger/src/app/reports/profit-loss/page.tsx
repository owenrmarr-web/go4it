import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ProfitLossClient from "@/components/ProfitLossClient";

export default async function ProfitLossPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <ProfitLossClient />
      </main>
    </div>
  );
}
