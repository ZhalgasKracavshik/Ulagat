import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./SettingsClient";
import { MfaSection } from "@/components/settings/MfaSection";

export const metadata = {
    title: "Settings — Ulagat",
    description: "Manage your appearance, language, display mode and privacy.",
};

/**
 * Settings hub. Authenticated (also guarded by middleware PROTECTED_ROUTES).
 *
 * This server shell only resolves auth and the initial privacy value; every
 * interactive control (theme, language, display mode, privacy toggle, sign
 * out) lives in the client <SettingsClient> so it can use the relevant hooks.
 */
export default async function SettingsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("leaderboard_anonymous, role")
        .eq("id", user.id)
        .single();

    // Two-factor auth is surfaced for staff only — the middleware requires
    // AAL2 on /admin once a factor is enrolled, so this is where staff set
    // it up. Students keep a simpler settings page.
    const isStaff = profile?.role === "admin" || profile?.role === "moderator";

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8 md:py-12">
                <SettingsClient
                    initialAnonymous={Boolean(profile?.leaderboard_anonymous)}
                />
                {isStaff && <MfaSection />}
            </div>
        </div>
    );
}
