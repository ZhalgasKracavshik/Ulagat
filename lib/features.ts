/**
 * Pilot feature flags. Some modules are hidden for the initial pilot and can be
 * switched back on (flip to true) once they're reworked. The implementation,
 * routes and DB tables stay in place — only the entry points and the routes
 * themselves are gated.
 *
 * - career:  the ЕНТ orientation tracker. Disabled for the pilot because its
 *            scoring model is wrong (real ЕНТ is 140 pts split 10/10/20/50/50,
 *            not a flat /40 per subject) and the specialty/cut-off data needs a
 *            maintained official source to be trustworthy.
 * - premium: the Stripe premium subscription. Disabled for the pilot — there's
 *            no premium-only value to sell yet (the AI mentor is future work).
 */
export const FEATURES: { career: boolean; premium: boolean } = {
    career: false,
    premium: false,
};
