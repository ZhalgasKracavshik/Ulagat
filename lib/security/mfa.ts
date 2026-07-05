import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side MFA step-up gate for privileged actions.
 *
 * The middleware redirects staff to /mfa before they can open an /admin page,
 * but Next.js server actions are POSTed directly and never load that page — so
 * without this check a stolen AAL1 staff session could invoke a privileged
 * mutation without ever presenting the second factor. Calling this inside the
 * staff/admin guards closes that gap: the authorization decision for the
 * mutation lives with the mutation, not only at page navigation.
 *
 * Returns true when the session has a verified factor it hasn't satisfied this
 * session (AAL2 required but current level is AAL1). Accounts WITHOUT an
 * enrolled factor return false (nextLevel stays 'aal1'), so nobody is blocked
 * before opting in.
 *
 * Fails OPEN on a transient GoTrue error: the role check + RLS are the primary
 * authorization boundary and must not brick because the assurance lookup
 * flaked. This second factor is defense in depth.
 */
export async function mfaStepUpRequired(supabase: SupabaseClient): Promise<boolean> {
    try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error || !data) return false;
        return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
    } catch (err) {
        console.error("[mfa] assurance check failed, allowing:", err);
        return false;
    }
}

/** Standard error message surfaced when a privileged action needs step-up. */
export const MFA_REQUIRED_ERROR =
    "Two-factor authentication required. Open the admin area, confirm your code, then retry.";
