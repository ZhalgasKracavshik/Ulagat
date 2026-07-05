"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { approveCertificate, rejectCertificate } from "@/app/certificates/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Loader2, FileText } from "lucide-react";
import { useT } from "@/hooks/useT";
import type { Certificate } from "@/types";

export type AdminCertificateRow = Certificate & {
    profiles?: { full_name: string | null; grade: number | null; class_letter: string | null } | null;
};

/**
 * Staff queue of pending certificate requests. Approving renders + stores the
 * official PDF server-side; rejecting requires a reason the requester will see.
 */
export function CertificateReviewTable({ certificates }: { certificates: AdminCertificateRow[] }) {
    const { t } = useT();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [reason, setReason] = useState("");

    const typeLabel = (type: Certificate["type"]) => {
        const key = {
            enrollment: "certificates.typeEnrollment",
            grades: "certificates.typeGrades",
            attendance: "certificates.typeAttendance",
            character: "certificates.typeCharacter",
        }[type];
        return key ? t(key) : type;
    };

    const handleApprove = (id: string) => {
        setBusyId(id);
        startTransition(async () => {
            const result = await approveCertificate(id);
            setBusyId(null);
            if (!result.success) {
                toast.error(result.error ?? t("certificates.processFailed"));
                return;
            }
            toast.success(result.emailsFailed ? t("certificates.approvedNoEmail") : t("certificates.approved"));
            router.refresh();
        });
    };

    const handleReject = (id: string) => {
        if (!reason.trim()) {
            toast.error(t("certificates.reasonRequired"));
            return;
        }
        setBusyId(id);
        startTransition(async () => {
            const result = await rejectCertificate(id, reason);
            setBusyId(null);
            if (!result.success) {
                toast.error(result.error ?? t("certificates.processFailed"));
                return;
            }
            toast.success(t("certificates.rejectedDone"));
            setRejectingId(null);
            setReason("");
            router.refresh();
        });
    };

    if (certificates.length === 0) {
        return (
            <p className="text-center py-8 text-muted-foreground">{t("certificates.queueEmpty")}</p>
        );
    }

    return (
        <div className="space-y-3">
            {certificates.map((cert) => {
                const student = cert.profiles;
                const cls = student?.grade
                    ? `${student.grade}${student.class_letter ? ` «${student.class_letter}»` : ""}`
                    : null;
                const busy = isPending && busyId === cert.id;
                const rejecting = rejectingId === cert.id;

                return (
                    <div key={cert.id} className="rounded-xl border bg-card p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <FileText className="h-4 w-4 shrink-0 text-cyan-600" />
                                    <span className="font-semibold text-foreground">{typeLabel(cert.type)}</span>
                                    {cls && <Badge variant="outline">{cls}</Badge>}
                                </div>
                                <p className="mt-1 text-sm text-foreground">
                                    {student?.full_name ?? "—"}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground break-words">
                                    {t("certificates.purposeLabel")}: {cert.purpose}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {new Date(cert.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => handleApprove(cert.id)}
                                    disabled={busy}
                                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    {t("certificates.approve")}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setRejectingId(rejecting ? null : cert.id);
                                        setReason("");
                                    }}
                                    disabled={busy}
                                    className="gap-1.5 text-red-600 hover:text-red-700"
                                >
                                    <XCircle className="h-4 w-4" />
                                    {t("certificates.reject")}
                                </Button>
                            </div>
                        </div>

                        {rejecting && (
                            <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                                <Textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder={t("certificates.reasonPlaceholder")}
                                    className="resize-none min-h-[70px] bg-background"
                                    maxLength={500}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)} disabled={busy}>
                                        {t("common.cancel")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleReject(cert.id)}
                                        disabled={busy}
                                    >
                                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("certificates.rejectConfirm")}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
