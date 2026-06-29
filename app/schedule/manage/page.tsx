import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { ScheduleGridEditor } from "@/components/schedule/ScheduleGridEditor";
import { ScheduleExcelImport } from "@/components/schedule/ScheduleExcelImport";
import { ScheduleBulkImport } from "@/components/schedule/ScheduleBulkImport";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";

export const dynamic = 'force-dynamic';

export default async function ScheduleManagePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
                <Card className="max-w-md w-full border-0 shadow-2xl text-center p-8 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">{t('scheduleManage.accessDenied')}</CardTitle>
                    <p className="text-muted-foreground">{t('scheduleManage.accessDeniedBody')}</p>
                    <Button variant="outline" className="w-full mt-4" asChild>
                        <Link href="/schedule">{t('scheduleManage.backToSchedule')}</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/50 py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('scheduleManage.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('scheduleManage.subtitle')}
                    </p>
                </div>
                <ScheduleExcelImport />
                <ScheduleBulkImport />
                <ScheduleGridEditor />
            </div>
        </div>
    );
}
