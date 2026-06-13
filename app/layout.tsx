import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/Navbar";
import { MobileTabBar } from "@/components/MobileTabBar";
import { UIPhaseProvider } from "@/contexts/UIPhaseContext";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n";
import { Toaster } from "sonner";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Ulagat - School Service & Event Platform",
  description: "Connect, Learn, and Compete with Ulagat.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve the locale server-side from the cookie so SSR matches the first
  // client render (no hydration mismatch). Falls back to the default locale.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const initialLocale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <body className={cn(outfit.variable, "min-h-screen bg-background font-sans antialiased")}>
        <ThemeProvider>
          <LocaleProvider initialLocale={initialLocale}>
            <UIPhaseProvider>
              <div className="relative flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1 pb-20 md:pb-0">
                  {children}
                </main>
                <MobileTabBar />
              </div>
            </UIPhaseProvider>
          </LocaleProvider>
        </ThemeProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
