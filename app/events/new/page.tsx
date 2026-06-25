
import { createEvent } from "../actions";
import { ImageUpload } from "@/components/shared/ImageUpload";
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
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { EVENT_CREATOR_ROLES, EVENT_TAGS } from "@/lib/events";
import { eventTagKey } from "@/lib/events-i18n";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";

export default async function NewEventPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    const allowedRoles: readonly string[] = EVENT_CREATOR_ROLES;
    if (!profile || !allowedRoles.includes(profile.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
                <Card className="max-w-md w-full border-0 shadow-2xl text-center p-8 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">{t('forms.accessDenied')}</CardTitle>
                    <p className="text-muted-foreground">{t('eventNew.accessDeniedBody')}</p>
                    <Button variant="outline" className="w-full mt-4" asChild>
                        <a href="/events">{t('eventNew.backToEvents')}</a>
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/50 py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('eventNew.title')}</h1>
                    <p className="text-muted-foreground">{t('eventNew.subtitle')}</p>
                </div>

                <Card className="border-0 shadow-xl shadow-blue-100/50 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">{t('eventNew.details')}</CardTitle>
                        <CardDescription>
                            {t('eventNew.detailsHint')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={createEvent} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-sm font-semibold text-foreground">{t('eventNew.titleLabel')}</Label>
                                <Input id="title" name="title" placeholder={t('eventNew.titlePlaceholder')} required className="h-12 border-border focus:ring-blue-500 rounded-lg shadow-sm" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="event_date" className="text-sm font-semibold text-foreground">{t('eventNew.dateTime')}</Label>
                                    <Input id="event_date" name="event_date" type="datetime-local" required className="h-12 border-border focus:ring-blue-500 rounded-lg shadow-sm" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location" className="text-sm font-semibold text-foreground">{t('eventNew.locationLabel')}</Label>
                                    <Input id="location" name="location" placeholder={t('eventNew.locationPlaceholder')} className="h-12 border-border focus:ring-blue-500 rounded-lg shadow-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="registration_deadline" className="text-sm font-semibold text-foreground">{t('eventNew.regDeadline')}</Label>
                                    <Input id="registration_deadline" name="registration_deadline" type="date" className="h-12 border-border focus:ring-blue-500 rounded-lg shadow-sm" />
                                    <p className="text-[11px] text-muted-foreground italic">{t('eventNew.regDeadlineHint')}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">{t('eventNew.tags')}</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {EVENT_TAGS.map((tag) => (
                                            <label key={tag} className="cursor-pointer">
                                                <input type="checkbox" name="tags" value={tag} className="peer sr-only" />
                                                <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold border border-border bg-muted text-muted-foreground transition-all peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600">
                                                    {t(eventTagKey(tag))}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <div className="space-y-2">
                                    <Label htmlFor="max_students" className="text-sm font-semibold text-foreground">{t('eventNew.maxStudents')}</Label>
                                    <Input id="max_students" name="max_students" type="number" min="1" placeholder={t('eventNew.maxStudentsPlaceholder')} className="h-12 border-border focus:ring-blue-500 rounded-lg shadow-sm" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground text-center block">{t('forms.coverImage')}</Label>
                                    <div className="border border-dashed border-border rounded-lg p-2 bg-muted/50">
                                        <ImageUpload bucketName="event-images" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="duration" className="text-sm font-semibold text-foreground">{t('eventNew.visibilityDuration')}</Label>
                                <Select name="duration" defaultValue="30">
                                    <SelectTrigger className="h-12 border-border rounded-lg shadow-sm">
                                        <SelectValue placeholder={t('eventNew.visibilityPlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">{t('eventNew.days7')}</SelectItem>
                                        <SelectItem value="14">{t('eventNew.days14')}</SelectItem>
                                        <SelectItem value="30">{t('eventNew.days30')}</SelectItem>
                                        <SelectItem value="60">{t('eventNew.days60')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] text-muted-foreground italic">{t('eventNew.visibilityHint')}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-semibold text-foreground">{t('eventNew.descriptionLabel')}</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder={t('eventNew.descriptionPlaceholder')}
                                    className="min-h-[120px] border-border focus:ring-blue-500 resize-none rounded-lg shadow-sm"
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg h-14 rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4">
                                {t('eventNew.publish')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
