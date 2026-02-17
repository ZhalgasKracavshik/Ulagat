
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SmartBadge } from "@/components/reputation/SmartBadge";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar, PlusCircle, Search, Trophy, User } from "lucide-react";

export default async function HomePage() {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Fetch Reputation Points
    const { data: reputation } = await supabase
        .from('reputation_ledger')
        .select('points')
        .eq('user_id', user.id);
    const totalPoints = reputation?.reduce((acc, curr) => acc + curr.points, 0) || 0;

    // Fetch Recent Events
    const { data: events } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true }) // Upcoming first
        .gte('event_date', new Date().toISOString())
        .limit(3);

    // Fetch New Services
    const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6">

            {/* Welcome Header */}
            <section className="flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-3xl text-white shadow-xl">
                <div className="flex items-center gap-6">
                    <Avatar className="w-20 h-20 border-4 border-white/30 shadow-md">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="text-blue-900 font-bold text-xl">{profile?.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name?.split(' ')[0]}! 👋</h1>
                        <div className="text-blue-100 flex items-center gap-2">
                            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none">
                                {profile?.role?.toUpperCase()}
                            </Badge>
                            <span>• Ready to learn something new today?</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <SmartBadge points={totalPoints} />
                    <p className="text-sm text-blue-100 opacity-80">Trust Score</p>
                </div>
            </section>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/services">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-blue-500">
                        <CardContent className="flex flex-col items-center justify-center p-6 gap-2 text-center">
                            <Search className="w-8 h-8 text-blue-500" />
                            <span className="font-semibold">Find Tutors</span>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/events">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-purple-500">
                        <CardContent className="flex flex-col items-center justify-center p-6 gap-2 text-center">
                            <Calendar className="w-8 h-8 text-purple-500" />
                            <span className="font-semibold">School Events</span>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/services/new">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-green-500">
                        <CardContent className="flex flex-col items-center justify-center p-6 gap-2 text-center">
                            <PlusCircle className="w-8 h-8 text-green-500" />
                            <span className="font-semibold">Post Service</span>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/leaderboard">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-amber-500">
                        <CardContent className="flex flex-col items-center justify-center p-6 gap-2 text-center">
                            <Trophy className="w-8 h-8 text-amber-500" />
                            <span className="font-semibold">Leaderboard</span>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Recent Events */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" /> Upcoming Events
                        </h2>
                        <Link href="/events" className="text-sm text-primary hover:underline">View all</Link>
                    </div>
                    {events && events.length > 0 ? (
                        <div className="space-y-3">
                            {events.map(event => (
                                <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="flex">
                                        <div className="bg-primary/10 w-24 flex flex-col items-center justify-center p-2 text-primary">
                                            <span className="text-xs font-bold uppercase">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-2xl font-bold">{new Date(event.event_date).getDate()}</span>
                                        </div>
                                        <div className="p-4 flex-1">
                                            <h3 className="font-semibold line-clamp-1">{event.title}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-1">{event.location || 'Online'}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm">No upcoming events.</p>
                    )}
                </section>

                {/* New Services */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <PlusCircle className="w-5 h-5 text-primary" /> Newest Services
                        </h2>
                        <Link href="/services" className="text-sm text-primary hover:underline">View all</Link>
                    </div>
                    {services && services.length > 0 ? (
                        <div className="space-y-3">
                            {services.map(service => (
                                <Card key={service.id} className="p-4 flex justify-between items-center hover:shadow-md transition-shadow">
                                    <div>
                                        <h3 className="font-medium line-clamp-1">{service.title}</h3>
                                        <Badge variant="secondary" className="text-xs mt-1">{service.category}</Badge>
                                    </div>
                                    <span className="font-bold text-primary">{service.price} ₸</span>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm">No services yet.</p>
                    )}
                </section>
            </div>
        </div>
    );
}
