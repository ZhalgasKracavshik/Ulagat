"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requestCertificate } from "@/app/certificates/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Send, ChevronDown, Check } from "lucide-react";
import { useT } from "@/hooks/useT";
import type { CertificateType } from "@/types";

const TYPE_OPTIONS: { value: CertificateType; labelKey: string }[] = [
    { value: "enrollment", labelKey: "certificates.typeEnrollment" },
    { value: "grades", labelKey: "certificates.typeGrades" },
    { value: "attendance", labelKey: "certificates.typeAttendance" },
    { value: "character", labelKey: "certificates.typeCharacter" },
];

export function CertificateRequestForm() {
    const { t } = useT();
    const router = useRouter();
    const [type, setType] = useState<CertificateType>("enrollment");
    const [purpose, setPurpose] = useState("");
    const [typeOpen, setTypeOpen] = useState(false);
    const [isSubmitting, startSubmitting] = useTransition();

    const typeLabel = t(TYPE_OPTIONS.find((o) => o.value === type)?.labelKey ?? "certificates.typeEnrollment");

    const handleSubmit = () => {
        if (!purpose.trim()) {
            toast.error(t("certificates.purposeRequired"));
            return;
        }

        startSubmitting(async () => {
            const result = await requestCertificate({ type, purpose });
            if (!result.success) {
                toast.error(result.error ?? t("certificates.submitFailed"));
                return;
            }
            toast.success(t("certificates.submitted"));
            router.push("/certificates");
            router.refresh();
        });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">{t("certificates.formType")}</Label>
                <button
                    type="button"
                    onClick={() => setTypeOpen(true)}
                    className="flex h-12 w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                    <span className="truncate text-base font-medium text-foreground">{typeLabel}</span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                </button>
            </div>

            <div className="space-y-2">
                <Label htmlFor="cert_purpose" className="text-sm font-semibold text-foreground">
                    {t("certificates.formPurpose")}
                </Label>
                <Textarea
                    id="cert_purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder={t("certificates.formPurposePlaceholder")}
                    className="resize-none min-h-[100px]"
                    maxLength={300}
                />
                <p className="text-xs text-muted-foreground">{t("certificates.formPurposeHint")}</p>
            </div>

            <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg h-12 rounded-xl shadow-lg gap-2"
            >
                <Send className="w-5 h-5" />
                {isSubmitting ? t("certificates.submitting") : t("certificates.submit")}
            </Button>

            {/* Certificate-type bottom sheet (same pattern as the announcement form). */}
            <Sheet open={typeOpen} onOpenChange={setTypeOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{t("certificates.formType")}</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-1 pt-1">
                        {TYPE_OPTIONS.map((o) => {
                            const active = type === o.value;
                            return (
                                <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => {
                                        setType(o.value);
                                        setTypeOpen(false);
                                    }}
                                    className={`flex h-14 w-full items-center gap-3 rounded-xl px-4 text-left text-base transition-colors ${active ? "bg-indigo-50 font-semibold dark:bg-indigo-950/40" : "hover:bg-muted"}`}
                                >
                                    {t(o.labelKey)}
                                    {active && <Check className="ml-auto h-5 w-5 shrink-0 text-indigo-600" aria-hidden />}
                                </button>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
