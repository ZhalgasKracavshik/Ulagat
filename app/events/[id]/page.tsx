
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, Trophy, ArrowLeft, Share2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EventDetailsPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: event } = await supabase
        .from('events')
        .select('*, profiles:organizer_id(*)')
        .eq('id', id)
        .single();

    if (!event) return notFound();

    return (
        <div className="container py-8 max-w-4xl">
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
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{event.title}</h1>
                    <div className="flex flex-wrap gap-4 text-white/90">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(event.event_date), 'MMMM d, yyyy @ h:mm a')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            <span>{event.location}</span>
                        </div>
                    </div>
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
                            <Button className="w-full text-lg h-12 font-bold bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-xl">
                                Register Now
                            </Button>
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
                                <p className="text-xs text-muted-foreground">{event.profiles?.role}</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
