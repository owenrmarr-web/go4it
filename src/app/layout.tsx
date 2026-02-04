import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientSessionProvider from "@/components/SessionProvider";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "GO4IT",
  description: "Free software tools to help small businesses do big things.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-gray-50 min-h-screen">
        <ClientSessionProvider>{children}</ClientSessionProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
