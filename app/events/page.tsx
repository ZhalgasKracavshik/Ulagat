
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Trophy, Users, Tag } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { CountdownWidget } from "@/components/events/CountdownWidget";
import { EVENT_CREATOR_ROLES, EVENT_TAGS, isEventTag, nextEntIso, nextHoliday } from "@/lib/events";
import { almatyTodayIso } from "@/lib/schedule/almaty-time";
import { eventTagKey, holidayNameKey } from "@/lib/events-i18n";
import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    getDictionary,
    isLocale,
    resolveKey,
} from "@/lib/i18n";

export const dynamic = 'force-dynamic';

type EventRow = {
    id: string;
    title: string;
    description: string;
    event_date: string;
    location: string | null;
    image_url: string | null;
    max_students: number | null;
    tags: string[] | null;
    registration_deadline: string | null;
};

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const supabase = await createClient();
    const params = await searchParams;
    const rawTag = typeof params?.tag === 'string' ? params.tag : null;
    const tagFilter = rawTag && isEventTag(rawTag) ? rawTag : null;

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

    const { data: { user } } = await supabase.auth.getUser();
    let profile: { role: string } | null = null;
    if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        profile = data;
    }

    let query = supabase
        .from('events')
        .select('*, profiles:organizer_id(*)')
        .eq('status', 'active')
        .order('event_date', { ascending: true });

    if (tagFilter) {
        query = query.contains('tags', [tagFilter]);
    }

    const { data: events } = await query;

    // Get registration counts for all events
    const eventIds = events?.map(e => e.id) || [];
    const registrationCounts: Record<string, number> = {};
    if (eventIds.length > 0) {
        const { data: regs } = await supabase
            .from('event_registrations')
            .select('event_id')
            .in('event_id', eventIds);

        if (regs) {
            regs.forEach((r: { event_id: string }) => {
                registrationCounts[r.event_id] = (registrationCounts[r.event_id] || 0) + 1;
            });
        }
    }

    // Nearest upcoming registration deadline (today or later, Almaty time)
    const todayIso = almatyTodayIso();
    const nearest = (events as EventRow[] | null)
        ?.filter((e) => e.registration_deadline && e.registration_deadline >= todayIso)
        .sort((a, b) => (a.registration_deadline! < b.registration_deadline! ? -1 : 1))[0];

    const canCreateEvent =
        profile !== null && (EVENT_CREATOR_ROLES as readonly string[]).includes(profile.role);

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-gradient-to-r from-blue-500/10 to-transparent p-6 rounded-2xl border border-blue-500/10">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                        {t('events.title')}
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-xl">
                        {t('events.subtitle')}
                    </p>
                </div>
                {/* Teachers, Admins, Moderators and Parliament can create events */}
                {canCreateEvent && (
                    <Link href="/events/new">
                        <Button size="lg" className="rounded-full shadow-lg gap-2 text-md font-bold px-6 bg-blue-600 hover:bg-blue-700">
                            <Trophy className="w-5 h-5" />
                            {t('events.hostEvent')}
                        </Button>
                    </Link>
                )}
            </div>

            {/* Countdown widgets: ЕНТ + next holiday + nearest registration deadline */}
            <CountdownWidget
                entDateIso={nextEntIso(todayIso)}
                holiday={nextHoliday(todayIso)}
                nearestEvent={
                    nearest
                        ? {
                            id: nearest.id,
                            title: nearest.title,
                            registrationDeadline: nearest.registration_deadline!,
                        }
                        : null
                }
            />

            {/* Tag filter chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                <Link href="/events">
                    <Button variant={!tagFilter ? "secondary" : "ghost"} size="sm" className="rounded-full px-4">
                        {t('events.all')}
                    </Button>
                </Link>
                {EVENT_TAGS.map((tag) => (
                    <Link key={tag} href={`/events?tag=${tag}`}>
                        <Button
                            variant={tagFilter === tag ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-full px-4"
                        >
                            {t(eventTagKey(tag))}
                        </Button>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events && events.length > 0 ? (
                    (events as EventRow[]).map((event) => {
                        const enrolled = registrationCounts[event.id] || 0;
                        return (
                            <Card key={event.id} className="group hover:shadow-xl transition-all border-blue-100 overflow-hidden">
                                <div className="aspect-video w-full bg-muted relative">
                                    {event.image_url ? (
                                        <img src={event.image_url} alt={event.title} className="object-cover w-full h-full" />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full bg-blue-50 dark:bg-blue-950/40 text-blue-200">
                                            <Trophy className="w-16 h-16" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 bg-card/90 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                        {format(new Date(event.event_date), 'MMM d, yyyy')}
                                    </div>
                                </div>
                                <CardHeader>
                                    <CardTitle className="line-clamp-1 group-hover:text-blue-600 transition-colors">{event.title}</CardTitle>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center text-xs text-muted-foreground gap-2">
                                            <MapPin className="w-3 h-3" />
                                            <span>{event.location || t('events.schoolHall')}</span>
                                        </div>
                                        {event.max_students && (
                                            <div className="flex items-center text-xs gap-1">
                                                <Users className="w-3 h-3 text-blue-500" />
                                                <span className={enrolled >= event.max_students ? "text-red-500 font-bold" : "text-muted-foreground"}>
                                                    {enrolled}/{event.max_students}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {event.tags && event.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {event.tags.map((tag) => (
                                                <Badge key={tag} variant="outline" className="text-[10px] uppercase tracking-wide bg-blue-50/50 dark:bg-blue-950/50 border-blue-200 text-blue-700">
                                                    {isEventTag(tag) ? t(eventTagKey(tag)) : tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <p className="line-clamp-3 text-sm text-muted-foreground">
                                        {event.description}
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Link href={`/events/${event.id}`} className="w-full">
                                        <Button className="w-full" variant="outline">
                                            {t('events.viewDetails')}
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="mx-auto w-24 h-24 bg-blue-50 dark:bg-blue-950/40 rounded-full flex items-center justify-center">
                            <Trophy className="w-12 h-12 text-blue-300" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">{t('events.noEventsTitle')}</h3>
                        <p className="text-muted-foreground">
                            {tagFilter
                                ? t('events.noEventsTagged', { tag: t(eventTagKey(tagFilter)) })
                                : t('events.noEventsDefault')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
