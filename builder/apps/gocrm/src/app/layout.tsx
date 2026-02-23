import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import ThemeProvider from "@/components/ThemeProvider";
import ThemedToaster from "@/components/ThemedToaster";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GoCRM",
  description: "Customer relationship management for small businesses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('gocrm-theme');if(t==='light'){document.documentElement.classList.remove('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.className} bg-surface-inset min-h-screen`}>
        <SessionProvider>
          <ThemeProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 ml-0 md:ml-64 min-h-screen">
                {children}
              </main>
            </div>
            <ThemedToaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
