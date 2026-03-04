import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SettingsForm from "./SettingsForm";

interface Settings {
  defaultTaxRate: number;
  defaultTerms: string;
  companyName: string;
  invoicePrefix: string;
  estimatePrefix: string;
}

const DEFAULT_SETTINGS: Settings = {
  defaultTaxRate: 0,
  defaultTerms: "Net 30",
  companyName: "",
  invoicePrefix: "INV-",
  estimatePrefix: "EST-",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { title: true },
  });

  let settings = DEFAULT_SETTINGS;
  if (user?.title) {
    try {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(user.title) };
    } catch {
      // Use defaults
    }
  }

  return <SettingsForm initialSettings={settings} />;
}
