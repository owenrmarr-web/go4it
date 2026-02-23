import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { Toaster } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('go4it-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}})()`,
          }}
        />
      </head>
      <body className={`${inter.className} bg-page text-fg min-h-screen`}>
        <SessionProvider>
          {children}
          <Toaster position="top-right" />
        </SessionProvider>
        <ThemeToggle className="fixed bottom-4 right-4 z-50 bg-card border border-edge shadow-lg" />
      </body>
    </html>
  );
}
