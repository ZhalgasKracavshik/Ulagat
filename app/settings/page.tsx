import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./SettingsClient";

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
        .select("leaderboard_anonymous")
        .eq("id", user.id)
        .single();

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
                <SettingsClient
                    initialAnonymous={Boolean(profile?.leaderboard_anonymous)}
                />
            </div>
        </div>
    );
}
