
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, Trophy, ArrowLeft, Share2, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { EventRegistrationButton } from "@/components/events/EventRegistrationButton";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EventDetailsPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

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

    // Fetch registration data
    let registrationCount = 0;
    let isRegistered = false;

    const { data: regs } = await supabase
        .from('event_registrations')
        .select('user_id')
        .eq('event_id', id);

    if (regs) {
        registrationCount = regs.length;
        if (user) {
            isRegistered = regs.some(r => r.user_id === user.id);
        }
    }

    const isFull = event.max_students ? registrationCount >= event.max_students : false;
    const isExpired = event.expires_at ? new Date(event.expires_at) < new Date() : false;

    return (
        <div className="container py-8 max-w-4xl mx-auto px-4">
            <Link href="/events" className="flex items-center text-sm text-muted-foreground hover:text-blue-600 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Events
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
                                <span>{event.location || 'School Hall'}</span>
                            </div>
                            {event.max_students && (
                                <div className="flex items-center gap-1.5">
                                    <Users className="w-4 h-4" />
                                    <span>{registrationCount} / {event.max_students} Registered</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Owner/Admin Controls */}
                    {(user?.id === event.organizer_id || ['admin', 'moderator'].includes(userRole)) && (
                        <div className="flex flex-col gap-2 items-end">
                            {event.expires_at && (
                                <div className="text-xs text-orange-200 font-medium bg-white/10 px-2 py-1 rounded backdrop-blur-sm">
                                    Expires: {new Date(event.expires_at).toLocaleDateString()}
                                </div>
                            )}
                            <form action={async () => {
                                "use server";
                                const { deleteEvent } = await import("../actions");
                                await deleteEvent(id);
                            }}>
                                <Button variant="destructive" size="sm" className="shadow-lg">
                                    Delete Event
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <div className="prose max-w-none">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Event Details</h2>
                        <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-700">{event.description}</p>
                    </div>

                    <Card className="bg-yellow-50 border-yellow-200">
                        <CardContent className="p-6 flex items-start gap-4">
                            <div className="p-3 bg-yellow-100 rounded-full text-yellow-700">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-yellow-900 mb-1">Reputation Rewards</h3>
                                <p className="text-sm text-yellow-800">
                                    Participating in this event awards verified reputation points on the Ulagat Blockchain. Winners receive special badges.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
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
                                />
                            ) : (
                                <Link href="/login" className="block w-full">
                                    <Button className="w-full text-lg h-12 font-bold bg-blue-600 hover:bg-blue-700">
                                        Login to Register
                                    </Button>
                                </Link>
                            )}
                            <Button variant="outline" className="w-full">
                                <Share2 className="w-4 h-4 mr-2" /> Share Event
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="p-4 border rounded-xl bg-slate-50">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Organizer</h4>
                        <Link href={`/profile/${event.organizer_id}`} className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={event.profiles?.avatar_url} />
                                <AvatarFallback>{event.profiles?.full_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-bold text-slate-900">{event.profiles?.full_name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{event.profiles?.role}</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
