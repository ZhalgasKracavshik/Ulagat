
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Trophy } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    let profile = null;
    if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        profile = data;
    }

    const { data: events } = await supabase
        .from('events')
        .select('*, profiles:organizer_id(*)')
        .order('event_date', { ascending: true });

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-gradient-to-r from-blue-500/10 to-transparent p-6 rounded-2xl border border-blue-500/10">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                        School Olympiads & Events
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-xl">
                        Challenge yourself. Win reputation. Be a legend.
                    </p>
                </div>
                {/* Only Admins/Moderators can create events */}
                {['admin', 'moderator'].includes(profile?.role) && (
                    <Link href="/events/new">
                        <Button size="lg" className="rounded-full shadow-lg gap-2 text-md font-bold px-6 bg-blue-600 hover:bg-blue-700">
                            <Trophy className="w-5 h-5" />
                            Host Event
                        </Button>
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events && events.length > 0 ? (
                    events.map((event: any) => (
                        <Card key={event.id} className="group hover:shadow-xl transition-all border-blue-100 overflow-hidden">
                            <div className="aspect-video w-full bg-slate-100 relative">
                                {event.image_url ? (
                                    <img src={event.image_url} alt={event.title} className="object-cover w-full h-full" />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full bg-blue-50 text-blue-200">
                                        <Trophy className="w-16 h-16" />
                                    </div>
                                )}
                                <div className="absolute top-2 left-2 bg-white/90 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                    {format(new Date(event.event_date), 'MMM d, yyyy')}
                                </div>
                            </div>
                            <CardHeader>
                                <CardTitle className="line-clamp-1 group-hover:text-blue-600 transition-colors">{event.title}</CardTitle>
                                <div className="flex items-center text-xs text-muted-foreground gap-2">
                                    <MapPin className="w-3 h-3" />
                                    <span>{event.location || 'School Hall'}</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="line-clamp-3 text-sm text-slate-600">
                                    {event.description}
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/events/${event.id}`} className="w-full">
                                    <Button className="w-full variant-outline border-blue-200 text-blue-700 hover:bg-blue-50">
                                        View Details
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="mx-auto w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center animate-pulse">
                            <Trophy className="w-12 h-12 text-blue-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No Events Scheduled</h3>
                        <p className="text-muted-foreground">Check back later or host your own!</p>
                        <Link href="/events/new">
                            <Button className="mt-4 bg-blue-600">Host an Event</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
