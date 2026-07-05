/**
 * Nonce-based Content-Security-Policy, currently in REPORT-ONLY mode.
 *
 * The middleware generates a per-request nonce, puts the policy on the
 * `Content-Security-Policy-Report-Only` request header (Next.js reads either
 * CSP request header to nonce its own inline scripts) and mirrors it on the
 * response so the browser reports violations to /api/csp-report without
 * blocking anything. Once Vercel logs stay quiet, switching to enforcement is
 * a one-line change in the middleware (drop the `-Report-Only` suffix).
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
        `frame-ancestors 'self'`,
        `form-action 'self'`,
        `base-uri 'self'`,
        `object-src 'none'`,
        `report-uri /api/csp-report`,
    ];

    return directives.join("; ");
}
