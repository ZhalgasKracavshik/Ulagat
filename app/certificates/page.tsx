import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { DownloadCertificateButton } from "@/components/certificates/DownloadCertificateButton";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";
import type { Certificate, CertificateStatus, CertificateType } from "@/types";

export const dynamic = "force-dynamic";

const TYPE_KEY: Record<CertificateType, string> = {
    enrollment: "certificates.typeEnrollment",
    grades: "certificates.typeGrades",
    attendance: "certificates.typeAttendance",
    character: "certificates.typeCharacter",
};

const STATUS_KEY: Record<CertificateStatus, string> = {
    pending: "certificates.statusPending",
    approved: "certificates.statusPending",
    rejected: "certificates.statusRejected",
    ready: "certificates.statusReady",
};

function StatusBadge({ status, label }: { status: CertificateStatus; label: string }) {
    if (status === "ready") {
        return (
            <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> {label}
            </Badge>
        );
    }
    if (status === "rejected") {
        return (
            <Badge className="gap-1 bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400">
                <XCircle className="h-3 w-3" /> {label}
            </Badge>
        );
    }
    return (
        <Badge className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400">
            <Clock className="h-3 w-3" /> {label}
        </Badge>
    );
}

export default async function CertificatesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

    // RLS returns only the caller's own rows (staff see all — but staff manage
    // the queue in /admin; here everyone sees their personal requests).
    const { data } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
    const certificates = (data ?? []) as Certificate[];

    return (
        <div className="container mx-auto py-8 space-y-6 px-4 md:px-6 max-w-3xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-100 dark:bg-cyan-950/50 rounded-full">
                        <FileText className="w-7 h-7 text-cyan-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">{t("certificates.title")}</h1>
                        <p className="text-muted-foreground text-sm">{t("certificates.subtitle")}</p>
                    </div>
                </div>
                <Button asChild className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Link href="/certificates/new">
                        <Plus className="h-4 w-4" />
                        {t("certificates.newRequest")}
                    </Link>
                </Button>
            </div>

            {certificates.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
                    <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <h2 className="mt-4 text-lg font-semibold text-foreground">{t("certificates.emptyTitle")}</h2>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{t("certificates.emptyBody")}</p>
                    <Button asChild className="mt-6 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Link href="/certificates/new">
                            <Plus className="h-4 w-4" />
                            {t("certificates.newRequest")}
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {certificates.map((cert) => (
                        <div key={cert.id} className="rounded-xl border bg-card p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-foreground">
                                            {t(TYPE_KEY[cert.type] ?? "certificates.typeEnrollment")}
                                        </span>
                                        <StatusBadge status={cert.status} label={t(STATUS_KEY[cert.status] ?? "certificates.statusPending")} />
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground break-words">
                                        {t("certificates.purposeLabel")}: {cert.purpose}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t("certificates.requestedOn")} {new Date(cert.created_at).toLocaleDateString()}
                                    </p>
                                    {cert.status === "rejected" && cert.rejection_reason && (
                                        <p className="mt-2 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                                            {t("certificates.rejectedReason")}: {cert.rejection_reason}
                                        </p>
                                    )}
                                </div>
                                {cert.status === "ready" && (
                                    <div className="shrink-0">
                                        <DownloadCertificateButton certificateId={cert.id} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
