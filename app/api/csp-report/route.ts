import { NextResponse } from "next/server";

/**
 * Receiver for CSP violation reports (`report-uri` in the policy set by the
 * middleware). Logs a compact line to the server console so violations show
 * up in Vercel runtime logs while the policy runs in Report-Only mode.
 *
 * Deliberately unauthenticated (browsers post reports without credentials)
 * and size-capped so it cannot be used to flood the logs.
 */
export async function POST(request: Request) {
    try {
        const text = await request.text();
        if (text.length > 8_192) {
            return new NextResponse(null, { status: 413 });
        }
        const body = JSON.parse(text);
        // Both the legacy {"csp-report": {...}} and Reporting-API shapes.
        const report = body["csp-report"] ?? body;
        console.warn("[csp-report]", JSON.stringify({
            documentUri: report["document-uri"] ?? report.documentURL,
            violatedDirective: report["violated-directive"] ?? report.effectiveDirective,
            blockedUri: report["blocked-uri"] ?? report.blockedURL,
            sourceFile: report["source-file"] ?? report.sourceFile,
            lineNumber: report["line-number"] ?? report.lineNumber,
        }));
    } catch {
        // Malformed report — nothing to do.
    }
    return new NextResponse(null, { status: 204 });
}
