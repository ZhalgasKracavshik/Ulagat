
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    getDictionary,
    isLocale,
    resolveKey,
} from "@/lib/i18n";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PaymentPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Server component: resolve locale from cookie and translate via dictionary.
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

    // Fetch service
    const { data: service } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

    if (!service) return <div>{t('servicePay.notFound')}</div>;

    // Payment Action (Mocked)
    async function processPayment() {
        "use server";
        const supabase = await createClient();

        // Require an authenticated caller who owns the service before mutating it.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            redirect('/login');
        }

        const { data: target } = await supabase
            .from('services')
            .select('owner_id')
            .eq('id', id)
            .single();

        if (!target || target.owner_id !== user.id) {
            throw new Error("Unauthorized");
        }

        // Update status to PENDING (Moderation required)
        await supabase.from('services').update({ status: 'pending' }).eq('id', id);

        // Redirect to services with a success flag
        redirect('/services?payment_success=true');
    }

    return (
        <div className="container flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full border-green-200">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-200">
                        <CreditCard className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-2xl">{t('servicePay.confirmTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <p className="text-muted-foreground">
                        {t('servicePay.intro')} <span className="font-bold text-foreground">{t('servicePay.amount')}</span> {t('servicePay.introSuffix')}
                    </p>
                    <div className="bg-muted p-4 rounded font-bold text-lg">
                        &quot;{service.title}&quot;
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t('servicePay.secureNote')}
                    </p>
                </CardContent>
                <CardFooter>
                    <form action={processPayment} className="w-full">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-lg h-12">
                            {t('servicePay.submit')}
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}
