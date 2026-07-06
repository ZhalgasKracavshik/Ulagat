/**
 * Nonce-based Content-Security-Policy, ENFORCING.
 *
 * The middleware generates a per-request nonce, puts the policy on the request
 * header (Next.js reads it to nonce its own inline scripts) and mirrors it on
 * the response so the browser enforces it. Violations are still reported to
 * /api/csp-report (report-uri works in enforce mode too).
 *
 * Notes on the directives:
 * - script-src uses 'strict-dynamic', which DISABLES host-source allowlists for
 *   scripts. That means 'self' is ignored for <script>, so anything loaded by a
 *   non-script mechanism needs its own directive — hence the explicit
 *   worker-src below, without which the service worker (/sw.js, registered via
 *   navigator.serviceWorker.register) would be blocked.
 * - Stripe is server-side only (redirect checkout), so no external script/frame
 *   origins are needed.
 */

/** 128-bit random nonce, base64 (Web Crypto — works in any runtime). */
export function generateNonce(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
}

export function buildCsp(nonce: string): string {
    const dev = process.env.NODE_ENV === "development";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseOrigin = supabaseUrl.replace(/^https:\/\//, "");
    const supabaseWs = supabaseOrigin ? `wss://${supabaseOrigin}` : "";

    const directives = [
        `default-src 'self'`,
        // strict-dynamic: scripts loaded by nonce-approved scripts are trusted,
        // so Next's chunk loading works without listing every chunk URL.
        // Dev needs unsafe-eval for React Refresh source maps.
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
        // Tailwind/Next inject inline style attributes; nonce-ing styles breaks
        // hydration-inserted rules, so inline styles stay allowed (standard).
        `style-src 'self' 'unsafe-inline'`,
        // User content: avatars/photos can point at arbitrary https origins
        // (next.config images.remotePatterns allows all hosts).
        `img-src 'self' blob: data: https:`,
        `font-src 'self' data:`,
        // Supabase REST + Realtime websocket. Dev adds HMR websockets.
        `connect-src 'self' ${supabaseUrl} ${supabaseWs}${dev ? " ws: wss:" : ""}`.replace(/\s+/g, " ").trim(),
        // The service worker (/sw.js) is same-origin but loaded via
        // serviceWorker.register(), not by a nonced script — strict-dynamic
        // would otherwise block it, so allow it explicitly.
        `worker-src 'self'`,
        // The web app manifest.
        `manifest-src 'self'`,
        `frame-ancestors 'self'`,
        `form-action 'self'`,
        `base-uri 'self'`,
        `object-src 'none'`,
        `report-uri /api/csp-report`,
    ];

    return directives.join("; ");
}
