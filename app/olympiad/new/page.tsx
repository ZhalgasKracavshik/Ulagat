
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { addStudyMaterial } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { InteractiveButton } from "@/components/shared/InteractiveButton";
import { PdfFileInput } from "@/components/olympiad/PdfFileInput";
import { MATERIAL_UPLOADER_ROLES } from "@/lib/olympiad";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";

export default async function NewMaterialPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    const allowedRoles: readonly string[] = MATERIAL_UPLOADER_ROLES;
    if (!profile || !allowedRoles.includes(profile.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
                <Card className="max-w-md w-full border-0 shadow-2xl text-center p-8 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">{t('forms.accessDenied')}</CardTitle>
                    <p className="text-muted-foreground">{t('olympiadNew.accessDeniedBody')}</p>
                    <Button variant="outline" className="w-full mt-4" asChild>
                        <a href="/olympiad">{t('olympiadNew.back')}</a>
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/50 py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('olympiadNew.title')}</h1>
                    <p className="text-muted-foreground">{t('olympiadNew.subtitle')}</p>
                </div>

                <Card className="border-0 shadow-xl shadow-indigo-100/50 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">{t('olympiadNew.info')}</CardTitle>
                        <CardDescription>
                            {t('olympiadNew.infoHint')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={addStudyMaterial} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-sm font-semibold text-foreground">{t('olympiadNew.titleLabel')}</Label>
                                <Input id="title" name="title" placeholder={t('olympiadNew.titlePlaceholder')} required className="h-11 border-border focus:ring-indigo-500 rounded-lg shadow-sm" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="text-sm font-semibold text-foreground">{t('olympiadNew.subject')}</Label>
                                    <Select name="category" required>
                                        <SelectTrigger className="h-11 border-border rounded-lg shadow-sm">
                                            <SelectValue placeholder={t('olympiadNew.subjectPlaceholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Math">Math</SelectItem>
                                            <SelectItem value="Physics">Physics</SelectItem>
                                            <SelectItem value="Chemistry">Chemistry</SelectItem>
                                            <SelectItem value="Biology">Biology</SelectItem>
                                            <SelectItem value="Informatics">Informatics</SelectItem>
                                            <SelectItem value="English">English</SelectItem>
                                            <SelectItem value="History">History</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="difficulty" className="text-sm font-semibold text-foreground">{t('olympiadNew.difficulty')}</Label>
                                    <Select name="difficulty" defaultValue="medium">
                                        <SelectTrigger className="h-11 border-border rounded-lg shadow-sm">
                                            <SelectValue placeholder={t('olympiadNew.difficultyPlaceholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="easy">{t('olympiad.diffEasy')}</SelectItem>
                                            <SelectItem value="medium">{t('olympiad.diffMedium')}</SelectItem>
                                            <SelectItem value="hard">{t('olympiad.diffHard')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="year" className="text-sm font-semibold text-foreground">{t('olympiadNew.year')}</Label>
                                    <Input id="year" name="year" type="number" min={1990} max={2100} placeholder={t('olympiadNew.yearPlaceholder')} className="h-11 border-border focus:ring-indigo-500 rounded-lg shadow-sm" />
                                    <p className="text-[11px] text-muted-foreground italic">{t('olympiadNew.yearHint')}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pdf" className="text-sm font-semibold text-foreground">{t('olympiadNew.pdf')}</Label>
                                    <PdfFileInput />
                                    <p className="text-[11px] text-muted-foreground italic">{t('olympiadNew.pdfHint')}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="url" className="text-sm font-semibold text-foreground">{t('olympiadNew.url')}</Label>
                                <Input id="url" name="url" type="url" placeholder="https://docs.google.com/..." className="h-11 border-border focus:ring-indigo-500 rounded-lg shadow-sm" />
                                <p className="text-[11px] text-muted-foreground italic">{t('olympiadNew.urlHint')}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-semibold text-foreground">{t('olympiadNew.description')}</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder={t('olympiadNew.descriptionPlaceholder')}
                                    className="min-h-[120px] border-border focus:ring-indigo-500 resize-none rounded-lg shadow-sm"
                                />
                            </div>

                            <InteractiveButton type="submit" loadingText={t('olympiadNew.publishing')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg h-14 rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4">
                                {t('olympiadNew.publish')}
                            </InteractiveButton>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
