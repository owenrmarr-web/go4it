import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { Shell } from "@/components/Shell";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GO4IT App",
  description: "A GO4IT marketplace application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <SessionProvider>
          <Shell>{children}</Shell>
          <Toaster position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
