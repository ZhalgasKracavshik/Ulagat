import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { MobileTabBar } from "@/components/MobileTabBar";
import { UIPhaseProvider } from "@/contexts/UIPhaseContext";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n";
import { Toaster } from "sonner";
import type { Profile } from "@/types";

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

  // Resolve auth + a minimal profile server-side so the Navbar / MobileTabBar
  // render the correct chrome (avatar, not the guest "Get started / Sign in"
  // buttons) on the first paint instead of flashing guest state while a
  // client-side auth fetch resolves.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let initialProfile: (Profile & { reputation?: number }) | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .eq("id", user.id)
      .single();
    // Minimal projection — enough for the chrome (avatar/name/role). Cast since
    // the Navbar/MobileTabBar only read avatar_url/full_name/role/reputation.
    initialProfile = (data as unknown as (Profile & { reputation?: number })) ?? null;
  }
  const initialUserId = user?.id ?? null;

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <body className={cn(outfit.variable, "min-h-screen bg-background font-sans antialiased")}>
        <ThemeProvider>
          <LocaleProvider initialLocale={initialLocale}>
            <UIPhaseProvider>
              <div className="relative flex min-h-screen flex-col">
                <Navbar initialUserId={initialUserId} initialProfile={initialProfile} />
                <main className="flex-1 pb-20 md:pb-0">
                  {children}
                </main>
                <MobileTabBar initialUserId={initialUserId} initialProfile={initialProfile} />
              </div>
            </UIPhaseProvider>
          </LocaleProvider>
        </ThemeProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
