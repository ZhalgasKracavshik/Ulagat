"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Sign-out action for the personal cabinet. Lives here (not in the navbar
 * avatar dropdown anymore) so the cabinet is the single, obvious place to
 * manage the account. Styled as a ghost/destructive text button — clear but
 * not a loud primary call to action.
 */
export function SignOutButton() {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    async function handleSignOut() {
        setLoading(true);
        await supabase.auth.signOut();
        window.location.href = "/";
    }

    return (
        <button
            type="button"
            onClick={handleSignOut}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        >
            <LogOut className="w-4 h-4" />
            {loading ? "Signing out…" : "Sign out"}
        </button>
    );
}
