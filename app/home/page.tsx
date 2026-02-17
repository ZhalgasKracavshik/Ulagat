
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SmartBadge } from "@/components/reputation/SmartBadge";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar, PlusCircle, Search, Trophy, ArrowRight, Star, Zap } from "lucide-react";

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
        .order('event_date', { ascending: true })
        .gte('event_date', new Date().toISOString())
        .limit(3);

    // Fetch New Services
    const { data: services } = await supabase
        .from('services')
        .select('*, profiles:owner_id(full_name, avatar_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);

    return (
        <div className="container mx-auto py-8 space-y-10 px-4 md:px-6">

            {/* Hero Section */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white shadow-2xl">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>

                <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <Avatar className="w-24 h-24 border-4 border-white/30 shadow-lg">
                                <AvatarImage src={profile?.avatar_url} className="object-cover" />
                                <AvatarFallback className="text-indigo-900 font-bold text-3xl">{profile?.full_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" />
                                <span>Level {Math.floor(totalPoints / 100) + 1}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                                Hello, {profile?.full_name?.split(' ')[0]}! 👋
                            </h1>
                            <p className="text-indigo-100 text-lg opacity-90 max-w-md">
                                Ready to expand your knowledge today? You have <span className="font-bold text-white">{totalPoints} points</span> on the blockchain.
                            </p>
                            <div className="flex gap-2">
                                <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md">
                                    {profile?.role?.toUpperCase()}
                                </Badge>
                                {(profile?.role === 'admin' || profile?.role === 'moderator') && (
                                    <Link href="/admin">
                                        <Badge className="bg-red-500/80 hover:bg-red-500 text-white border-0 cursor-pointer">
                                            ADMIN PANEL
                                        </Badge>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 min-w-[280px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-indigo-100 uppercase tracking-wider text-xs">Trust Score</h3>
                            <Zap className="w-4 h-4 text-yellow-400" />
                        </div>
                        <SmartBadge points={totalPoints} />
                    </div>
                </div>
            </section>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[
                    { href: "/services", icon: Search, label: "Find Tutors", color: "text-blue-600", bg: "bg-blue-50", border: "hover:border-blue-200", roles: ['student', 'teacher', 'admin', 'moderator'] },
                    { href: "/events", icon: Calendar, label: "School Events", color: "text-purple-600", bg: "bg-purple-50", border: "hover:border-purple-200", roles: ['student', 'teacher', 'admin', 'moderator'] },
                    { href: "/services/new", icon: PlusCircle, label: "Post Service", color: "text-green-600", bg: "bg-green-50", border: "hover:border-green-200", roles: ['teacher', 'admin', 'moderator'] },
                    { href: "/leaderboard", icon: Trophy, label: "Leaderboard", color: "text-amber-600", bg: "bg-amber-50", border: "hover:border-amber-200", roles: ['student', 'teacher', 'admin', 'moderator'] },
                ].filter(action => action.roles.includes(profile?.role || 'student')).map((action, idx) => (
                    <Link key={idx} href={action.href}>
                        <Card className={`h-full border border-transparent shadow-sm hover:shadow-md transition-all duration-300 ${action.border}`}>
                            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full gap-3">
                                <div className={`p-4 rounded-full ${action.bg} ${action.color} mb-1`}>
                                    <action.icon className="w-8 h-8" />
                                </div>
                                <span className="font-bold text-slate-700">{action.label}</span>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Upcoming Events */}
                <section className="lg:col-span-1 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <Calendar className="w-5 h-5 text-purple-600" /> Upcoming Events
                        </h2>
                        <Link href="/events" className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center">
                            View all <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {events && events.length > 0 ? (
                            events.map(event => (
                                <Link key={event.id} href={`/events/${event.id}`}>
                                    <div className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 flex gap-4 cursor-pointer">
                                        <div className="bg-purple-50 text-purple-700 rounded-lg w-16 h-16 flex flex-col items-center justify-center shrink-0">
                                            <span className="text-xs font-bold uppercase">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-2xl font-bold leading-none">{new Date(event.event_date).getDate()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 truncate group-hover:text-purple-600 transition-colors">{event.title}</h3>
                                            <p className="text-sm text-slate-500 truncate">{event.location || 'Online'}</p>
                                            <div className="mt-2 flex items-center text-xs text-slate-400 font-medium bg-slate-50 w-fit px-2 py-1 rounded">
                                                By Ulagat Team
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-400 border border-dashed">
                                No upcoming events found.
                            </div>
                        )}
                    </div>
                </section>

                {/* New Services Grid */}
                <section className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <PlusCircle className="w-5 h-5 text-blue-600" /> Featured Services
                        </h2>
                        <Link href="/services" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                            View all <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        {services && services.length > 0 ? (
                            services.map(service => (
                                <Link key={service.id} href={`/services/${service.id}`}>
                                    <div className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-all overflow-hidden h-full flex flex-col">
                                        <div className="h-32 bg-slate-100 relative overflow-hidden">
                                            {service.image_url ? (
                                                <img src={service.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={service.title} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                                    <span className="text-4xl font-black opacity-10">{service.category[0]}</span>
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2">
                                                <Badge className="bg-white/90 text-slate-800 shadow-sm hover:bg-white">{service.category}</Badge>
                                            </div>
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{service.title}</h3>
                                                <span className="font-bold text-green-600 whitespace-nowrap">{service.price > 0 ? `${service.price} ₸` : 'Free'}</span>
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{service.description}</p>

                                            <div className="flex items-center gap-2 pt-3 border-t border-slate-50 mt-auto">
                                                <Avatar className="w-6 h-6">
                                                    <AvatarImage src={service.profiles?.avatar_url} />
                                                    <AvatarFallback className="text-[10px]">{service.profiles?.full_name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-medium text-slate-600 truncate">{service.profiles?.full_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="col-span-2 bg-slate-50 rounded-xl p-12 text-center text-slate-400 border border-dashed">
                                No services found. Be the first to post!
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
