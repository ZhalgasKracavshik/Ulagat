"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/validation";
import { almatyNow, almatyTodayIso } from "@/lib/schedule/almaty-time";
import { renderCertificatePdf } from "@/lib/pdf/certificate";
import { notifyCertificateProcessed } from "@/lib/notifications/certificate";
import type { Certificate, CertificateType } from "@/types";

export type RequestCertificateInput = {
    type: CertificateType;
    purpose: string;
};

export type RequestCertificateResult = { success: true } | { success: false; error: string };

export type ProcessCertificateResult = {
    success: boolean;
    error?: string;
    /** True when the decision was saved but the notification email failed. */
    emailsFailed?: boolean;
};

export type DownloadUrlResult = { url: string } | { error: string };

const CERT_TYPES: CertificateType[] = ["enrollment", "grades", "attendance", "character"];

/** Defensive trim: returns '' for anything that is not a string. */
function safeTrim(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

async function requireStaff(): Promise<
    | { ok: true; userId: string; fullName: string; role: string }
    | { ok: false; error: string }
> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    if (!profile || !["admin", "moderator"].includes(profile.role)) {
        return { ok: false, error: "Unauthorized: only moderators and admins can process certificates." };
    }
    return { ok: true, userId: user.id, fullName: profile.full_name ?? "", role: profile.role };
}

/** Academic year label for an Almaty date: Sep–Dec → "Y–Y+1", Jan–Aug → "Y-1–Y". */
function academicYearLabel(): string {
    const now = almatyNow();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1; // 1..12
    return m >= 9 ? `${y}–${y + 1}` : `${y - 1}–${y}`;
}

/** Human-readable document number derived from the row id (stable, non-guessy). */
function docNumberFor(certId: string): string {
    const year = almatyNow().getUTCFullYear();
    return `SPR-${year}-${certId.slice(0, 6).toUpperCase()}`;
}

/**
 * Creates a certificate request for the current user. RLS pins user_id to
 * auth.uid() and status to 'pending', so even a tampered payload cannot
 * create an approved certificate or a request on someone else's behalf.
 */
export async function requestCertificate(input: RequestCertificateInput): Promise<RequestCertificateResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    if (!CERT_TYPES.includes(input.type)) {
        return { success: false, error: "Invalid certificate type." };
    }
    const purpose = safeTrim(input.purpose);
    if (!purpose || purpose.length > 300) {
        return { success: false, error: "Purpose is required (max 300 characters)." };
    }

    // Usability guard: one open request of a given type at a time.
    const { count: openCount } = await supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("type", input.type)
        .eq("status", "pending");
    if ((openCount ?? 0) > 0) {
        return { success: false, error: "You already have a pending request of this type." };
    }

    const { error } = await supabase.from("certificates").insert({
        user_id: user.id,
        type: input.type,
        purpose,
    });

    if (error) {
        // 23505 = the partial unique index (one pending request per type) —
        // catches the race the count-check above can miss.
        if (error.code === "23505") {
            return { success: false, error: "You already have a pending request of this type." };
        }
        console.error("requestCertificate insert error:", error);
        return { success: false, error: "Failed to submit the request." };
    }

    revalidatePath("/certificates");
    return { success: true };
}

/**
 * Approves a pending request: renders the official PDF server-side, uploads it
 * to the PRIVATE `certificates` bucket (service role — the bucket has no user
 * write policies), marks the row 'ready' and emails the requester.
 */
export async function approveCertificate(id: string): Promise<ProcessCertificateResult> {
    const auth = await requireStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!isUuid(id)) return { success: false, error: "Invalid certificate id." };

    const supabase = await createClient();

    // Load the request (staff RLS SELECT) + the requester's profile.
    const { data: certRow } = await supabase
        .from("certificates")
        .select("*")
        .eq("id", id)
        .single();
    const cert = certRow as Certificate | null;
    if (!cert) return { success: false, error: "Certificate request not found." };
    if (cert.status !== "pending") {
        return { success: false, error: "Only pending requests can be approved." };
    }

    const { data: requester } = await supabase
        .from("profiles")
        .select("full_name, grade, class_letter")
        .eq("id", cert.user_id)
        .single();
    if (!requester) return { success: false, error: "Requester profile not found." };

    // ---- Render the PDF ----
    let pdf: Buffer;
    try {
        pdf = await renderCertificatePdf({
            fullName: requester.full_name ?? "",
            grade: requester.grade ?? null,
            classLetter: requester.class_letter ?? null,
            type: cert.type,
            purpose: cert.purpose,
            docNumber: docNumberFor(cert.id),
            issuedDate: almatyTodayIso(),
            academicYear: academicYearLabel(),
            issuerName: auth.fullName,
            issuerRole: auth.role,
        });
    } catch (err) {
        console.error("approveCertificate PDF render error:", err);
        return { success: false, error: "Failed to generate the PDF." };
    }

    // ---- Upload to the private bucket (service role only) ----
    const pdfPath = `${cert.user_id}/${cert.id}.pdf`;
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
        .from("certificates")
        .upload(pdfPath, pdf, { contentType: "application/pdf", upsert: true });
    if (uploadError) {
        console.error("approveCertificate upload error:", uploadError);
        return { success: false, error: "Failed to store the PDF." };
    }

    // ---- Mark ready (staff RLS UPDATE). Guard on status to avoid double-processing races. ----
    const { data: updated, error: updateError } = await supabase
        .from("certificates")
        .update({
            status: "ready",
            pdf_path: pdfPath,
            processed_by: auth.userId,
            processed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "pending")
        .select("id");
    if (updateError || !updated || updated.length === 0) {
        console.error("approveCertificate update error:", updateError);
        return { success: false, error: "Failed to update the request status." };
    }

    // ---- Notify the requester (non-fatal) ----
    let emailsFailed = false;
    try {
        const result = await notifyCertificateProcessed(id);
        emailsFailed = result.failed;
    } catch (err) {
        console.error("approveCertificate notification error:", err);
        emailsFailed = true;
    }

    revalidatePath("/certificates");
    revalidatePath("/admin");
    return { success: true, emailsFailed };
}

/** Rejects a pending request with a required human-readable reason. */
export async function rejectCertificate(id: string, reason: string): Promise<ProcessCertificateResult> {
    const auth = await requireStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!isUuid(id)) return { success: false, error: "Invalid certificate id." };
    const trimmedReason = safeTrim(reason);
    if (!trimmedReason || trimmedReason.length > 500) {
        return { success: false, error: "Rejection reason is required (max 500 characters)." };
    }

    const supabase = await createClient();
    const { data: updated, error } = await supabase
        .from("certificates")
        .update({
            status: "rejected",
            rejection_reason: trimmedReason,
            processed_by: auth.userId,
            processed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "pending")
        .select("id");
    if (error || !updated || updated.length === 0) {
        console.error("rejectCertificate update error:", error);
        return { success: false, error: "Only pending requests can be rejected." };
    }

    let emailsFailed = false;
    try {
        const result = await notifyCertificateProcessed(id);
        emailsFailed = result.failed;
    } catch (err) {
        console.error("rejectCertificate notification error:", err);
        emailsFailed = true;
    }

    revalidatePath("/certificates");
    revalidatePath("/admin");
    return { success: true, emailsFailed };
}

/**
 * Returns a short-lived signed URL for a ready certificate PDF. Access rule
 * mirrors RLS: the row must be visible to the caller (own row, or staff) —
 * we re-check ownership/role server-side before minting the signed URL,
 * because signing uses the service role and bypasses RLS.
 */
export async function getCertificateDownloadUrl(id: string): Promise<DownloadUrlResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    if (!isUuid(id)) return { error: "Invalid certificate id." };

    // RLS-scoped read: returns the row only if it's the caller's own or the
    // caller is staff. Anything else -> not found.
    const { data: certRow } = await supabase
        .from("certificates")
        .select("id, user_id, status, pdf_path")
        .eq("id", id)
        .single();
    if (!certRow || certRow.status !== "ready" || !certRow.pdf_path) {
        return { error: "Certificate is not available for download." };
    }

    // Defense in depth: the stored path must match the canonical layout for
    // this row — a tampered pdf_path can never point at another user's file.
    const expectedPath = `${certRow.user_id}/${certRow.id}.pdf`;
    if (certRow.pdf_path !== expectedPath) {
        console.error("getCertificateDownloadUrl path mismatch:", certRow.id);
        return { error: "Certificate file is unavailable." };
    }

    const admin = createAdminClient();
    const { data, error } = await admin.storage
        .from("certificates")
        // 5-minute link; download flag sets Content-Disposition so the browser
        // saves the file (with a readable name) instead of navigating away.
        .createSignedUrl(expectedPath, 300, {
            download: `spravka-${certRow.id.slice(0, 6)}.pdf`,
        });
    if (error || !data?.signedUrl) {
        console.error("getCertificateDownloadUrl sign error:", error);
        return { error: "Failed to create the download link." };
    }
    return { url: data.signedUrl };
}
