
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, Trophy, ArrowLeft, Share2, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { EventRegistrationButton } from "@/components/events/EventRegistrationButton";
import { almatyTodayIso } from "@/lib/schedule/almaty-time";
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

export default async function EventDetailsPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Server component: resolve locale from cookie and translate via dictionary.
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string, vars?: Record<string, string | number>) => {
        let value = resolveKey(dict, key);
        if (vars) {
            for (const [name, replacement] of Object.entries(vars)) {
                value = value.replace(`{${name}}`, String(replacement));
            }
        }
        return value;
    };

    // Fetch user and profile first
    const { data: { user } } = await supabase.auth.getUser();
    let userRole = 'student';
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        userRole = profile?.role || 'student';
    }

    // Fetch event details
    const { data: event } = await supabase
        .from('events')
        .select('*, profiles:organizer_id(*)')
        .eq('id', id)
        .single();

    if (!event) return notFound();

    // P1-4: pending/rejected/archived events are only visible to their
    // organizer and staff — everyone else gets a 404, so unmoderated content
    // is not reachable (or registerable) by direct link.
    const isOrganizer = user?.id === event.organizer_id;
    const isStaff = ['admin', 'moderator'].includes(userRole);
    if (event.status !== 'active' && !isOrganizer && !isStaff) {
        return notFound();
    }

    // Fetch registration data (with profile info for the delegation list)
    let registrationCount = 0;
    let isRegistered = false;

    type RegistrationRow = {
        user_id: string;
        profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
    };

    const { data: regsRaw } = await supabase
        .from('event_registrations')
        .select('user_id, profiles:user_id(id, full_name, avatar_url)')
        .eq('event_id', id)
        .order('registered_at', { ascending: true });

    const regs = (regsRaw ?? []) as unknown as RegistrationRow[];
    registrationCount = regs.length;
    if (user) {
        isRegistered = regs.some(r => r.user_id === user.id);
    }

    const isFull = event.max_students ? registrationCount >= event.max_students : false;
    const isExpired = event.expires_at ? new Date(event.expires_at) < new Date() : false;
    // P2-2: registration closes at the end of the deadline day (Almaty time).
    const deadlinePassed = event.registration_deadline
        ? almatyTodayIso() > event.registration_deadline
        : false;

    return (
        <div className="container py-8 max-w-4xl mx-auto px-4">
            <Link href="/events" className="flex items-center text-sm text-muted-foreground hover:text-blue-600 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> {t('events.backToEvents')}
            </Link>

            <div className="relative h-[300px] w-full rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 mb-8">
                {event.image_url ? (
                    <img src={event.image_url} alt={event.title} className="object-cover w-full h-full opacity-50" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Trophy className="w-32 h-32 text-white/20" />
                    </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{event.title}</h1>
                        <div className="flex flex-wrap gap-4 text-white/90">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>{format(new Date(event.event_date), 'MMMM d, yyyy @ h:mm a')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                <span>{event.location || t('events.schoolHall')}</span>
                            </div>
                            {event.max_students && (
                                <div className="flex items-center gap-1.5">
                                    <Users className="w-4 h-4" />
                                    <span>{t('events.registeredCount', { count: registrationCount, max: event.max_students })}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Owner/Admin Controls */}
                    {(user?.id === event.organizer_id || ['admin', 'moderator'].includes(userRole)) && (
                        <div className="flex flex-col gap-2 items-end">
                            {event.expires_at && (
                                <div className="text-xs text-orange-200 font-medium bg-card/10 px-2 py-1 rounded backdrop-blur-sm">
                                    {t('events.expires', { date: new Date(event.expires_at).toLocaleDateString() })}
                                </div>
                            )}
                            <form action={async () => {
                                "use server";
                                const { deleteEvent } = await import("../actions");
                                await deleteEvent(id);
                            }}>
                                <Button variant="destructive" size="sm" className="shadow-lg">
                                    {t('events.deleteEvent')}
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <div className="prose max-w-none">
                        <h2 className="text-2xl font-bold text-foreground mb-4">{t('events.eventDetails')}</h2>
                        <p className="whitespace-pre-wrap text-lg leading-relaxed text-foreground">{event.description}</p>
                    </div>

                    <Card className="bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200">
                        <CardContent className="p-6 flex items-start gap-4">
                            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-700 dark:text-yellow-200">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-yellow-900 mb-1">{t('events.reputationRewards')}</h3>
                                <p className="text-sm text-yellow-800">
                                    {t('events.reputationRewardsBody')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Delegation / participants list */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Users className="w-6 h-6 text-blue-600" />
                            {t('events.participants')}
                            <span className="text-base font-semibold text-muted-foreground">({registrationCount})</span>
                        </h2>
                        {regs.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {regs.map((reg) => (
                                    <Link
                                        key={reg.user_id}
                                        href={`/profile/${reg.user_id}`}
                                        className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-blue-50/50 hover:border-blue-200 transition-colors"
                                    >
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={reg.profiles?.avatar_url ?? undefined} />
                                            <AvatarFallback>{reg.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-semibold text-foreground truncate">
                                            {reg.profiles?.full_name || t('events.unknownUser')}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground border border-dashed rounded-xl p-6 text-center">
                                {t('events.noParticipants')}
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            {user ? (
                                <EventRegistrationButton
                                    eventId={id}
                                    isRegistered={isRegistered}
                                    isFull={isFull}
                                    isExpired={isExpired}
                                    deadlinePassed={deadlinePassed}
                                />
                            ) : (
                                <Link href="/login" className="block w-full">
                                    <Button className="w-full text-lg h-12 font-bold bg-blue-600 hover:bg-blue-700">
                                        {t('events.loginToRegister')}
                                    </Button>
                                </Link>
                            )}
                            <Button variant="outline" className="w-full">
                                <Share2 className="w-4 h-4 mr-2" /> {t('events.shareEvent')}
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="p-4 border rounded-xl bg-muted">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">{t('events.organizer')}</h4>
                        <Link href={`/profile/${event.organizer_id}`} className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={event.profiles?.avatar_url} />
                                <AvatarFallback>{event.profiles?.full_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-bold text-foreground">{event.profiles?.full_name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{event.profiles?.role}</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
