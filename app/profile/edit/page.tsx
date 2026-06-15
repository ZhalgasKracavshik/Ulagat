
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { updateProfile } from "./actions";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { SocialLinksEditor } from "@/components/profile/SocialLinksEditor";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";

export default async function EditProfilePage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    // Parse existing social links
    const socialLinks = profile?.social_links || [];

    // Error passed back by the updateProfile action (e.g. invalid grade, DB failure)
    const { error: saveError } = await searchParams;

    return (
        <div className="min-h-screen bg-background py-10 px-4">
            <div className="mx-auto max-w-2xl space-y-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-foreground">{t('profileEdit.title')}</h1>
                    <p className="text-muted-foreground mt-2">{t('profileEdit.subtitle')}</p>
                </div>

                {saveError && (
                    <div
                        role="alert"
                        className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300"
                    >
                        {saveError}
                    </div>
                )}

                <form action={updateProfile} className="space-y-6">
                    {/* Avatar Section */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">{t('profileEdit.photo')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <AvatarUpload currentAvatarUrl={profile?.avatar_url} />
                        </CardContent>
                    </Card>

                    {/* Basic Info */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">{t('profileEdit.basicInfo')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">{t('profileEdit.fullName')}</Label>
                                <Input
                                    id="full_name"
                                    name="full_name"
                                    defaultValue={profile?.full_name || ''}
                                    required
                                    className="h-11"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="grade">{t('profileEdit.grade')}</Label>
                                    <Input
                                        id="grade"
                                        name="grade"
                                        type="number"
                                        min={1}
                                        max={11}
                                        defaultValue={profile?.grade ?? ''}
                                        placeholder={t('profileEdit.gradePlaceholder')}
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="class_letter">{t('profileEdit.classLetter')}</Label>
                                    <Input
                                        id="class_letter"
                                        name="class_letter"
                                        maxLength={3}
                                        defaultValue={profile?.class_letter ?? ''}
                                        placeholder={t('profileEdit.classLetterPlaceholder')}
                                        className="h-11"
                                    />
                                </div>
                                <p className="col-span-2 text-xs text-muted-foreground -mt-2">
                                    {t('profileEdit.classHint')}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio">{t('profileEdit.bio')}</Label>
                                <Textarea
                                    id="bio"
                                    name="bio"
                                    defaultValue={profile?.bio || ''}
                                    placeholder={t('profileEdit.bioPlaceholder')}
                                    className="min-h-[120px] resize-none"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Social Links */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">{t('profileEdit.socialLinks')}</CardTitle>
                            <CardDescription>{t('profileEdit.socialLinksHint')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SocialLinksEditor initialLinks={socialLinks} />
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                        <Link href="/profile/me" className="w-full">
                            <Button variant="outline" className="w-full h-12 text-base" type="button">{t('profileEdit.cancel')}</Button>
                        </Link>
                        <Button type="submit" className="w-full h-12 text-base font-bold">{t('profileEdit.saveChanges')}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
