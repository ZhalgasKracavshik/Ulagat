import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/Navbar";
import { MobileTabBar } from "@/components/MobileTabBar";
import { UIPhaseProvider } from "@/contexts/UIPhaseContext";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Ulagat - School Service & Event Platform",
  description: "Connect, Learn, and Compete with Ulagat.",
};

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(outfit.variable, "min-h-screen bg-background font-sans antialiased")}>
        <UIPhaseProvider>
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 pb-20 md:pb-0">
              {children}
            </main>
            <MobileTabBar />
          </div>
        </UIPhaseProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
