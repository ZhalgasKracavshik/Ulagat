import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CertificateRequestForm } from "@/components/certificates/CertificateRequestForm";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function NewCertificatePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

    return (
        <div className="min-h-screen bg-muted/50 py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("certificates.formTitle")}</h1>
                    <p className="text-muted-foreground">{t("certificates.formSubtitle")}</p>
                </div>

                <Card className="border-0 shadow-xl shadow-indigo-100/50 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-cyan-500 via-indigo-500 to-blue-500" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">{t("certificates.formDetails")}</CardTitle>
                        <CardDescription>{t("certificates.formDetailsHint")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CertificateRequestForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
