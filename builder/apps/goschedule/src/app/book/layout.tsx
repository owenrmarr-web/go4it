import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import ThemeToggle from "@/components/ThemeToggle";
import TimezoneLabel from "@/components/TimezoneLabel";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.businessSettings.findFirst();
  const title = settings?.bookingPageTitle || settings?.businessName || "Book an Appointment";
  const description = settings?.welcomeMessage || `Book an appointment with ${settings?.businessName || "us"} online.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await prisma.businessSettings.findFirst();

  return (
    <div className="min-h-screen bg-card">
      <header className="border-b border-edge px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <a
            href="/book"
            className="text-lg font-bold hover:opacity-80 transition-opacity"
            style={{ color: settings?.bookingPageColor || "#7c3aed" }}
          >
            {settings?.bookingPageTitle || settings?.businessName || "Book an Appointment"}
          </a>
          <div className="flex items-center gap-2">
            <TimezoneLabel />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
