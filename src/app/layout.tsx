import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientSessionProvider from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GenerationProvider } from "@/components/GenerationContext";
import { ActiveOrgProvider } from "@/contexts/ActiveOrgContext";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "GO4IT — AI-Powered Business Tools",
    template: "%s | GO4IT",
  },
  description:
    "Free AI-enabled software tools to help small businesses do big things. Browse, deploy, and start using apps in minutes.",
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://go4it.live"),
  openGraph: {
    title: "GO4IT — AI-Powered Business Tools",
    description:
      "Free AI-enabled software tools to help small businesses do big things. Browse, deploy, and start using apps in minutes.",
    url: "https://go4it.live",
    siteName: "GO4IT",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "GO4IT — AI-Powered Business Tools",
    description:
      "Free AI-enabled software tools to help small businesses do big things.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-gray-50 min-h-screen">
        <ClientSessionProvider>
          <ActiveOrgProvider>
            <GenerationProvider>
              <ThemeProvider>{children}</ThemeProvider>
            </GenerationProvider>
          </ActiveOrgProvider>
        </ClientSessionProvider>
        <Toaster position="bottom-left" richColors />
      </body>
    </html>
  );
}
