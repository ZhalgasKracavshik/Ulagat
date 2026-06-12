
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SmartBadge } from "@/components/reputation/SmartBadge";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar, PlusCircle, Search, Trophy, ArrowRight, Star, Zap, GraduationCap, MessageCircle, Megaphone, Pin } from "lucide-react";
import { CategoryBadge } from "@/components/announcements/CategoryBadge";
import { getViewerGrades, announcementGradeFilter } from "@/lib/announcements/visibility";
import type { Announcement } from "@/types";

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
        .limit(4);

    // Fetch New Services
    const { data: services } = await supabase
        .from('services')
        .select('*, profiles:owner_id(full_name, avatar_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);

    // Fetch latest official announcements (expires_at is an absolute instant
    // set at creation — end of day Asia/Almaty — so compare with absolute now).
    // Same grade targeting as /announcements: students/parents only see
    // school-wide announcements plus those targeting their grades.
    const viewerGrades = await getViewerGrades(supabase, user.id);
    let announcementQuery = supabase
        .from('announcements')
        .select('*')
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(3);
    const gradeFilter = announcementGradeFilter(viewerGrades);
    if (gradeFilter) {
        announcementQuery = announcementQuery.or(gradeFilter);
    }
    const { data: announcementRows } = await announcementQuery;
    const announcements = (announcementRows ?? []) as Announcement[];

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
                                Ready to expand your knowledge today? You have <span className="font-bold text-white">{totalPoints} points</span>.
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-5">
                {[
                    { href: "/services", icon: Search, label: "Find Tutors", color: "text-blue-600", bg: "bg-blue-50", border: "hover:border-blue-200", roles: ['student', 'teacher', 'admin', 'moderator'] },
                    { href: "/events", icon: Calendar, label: "Events", color: "text-purple-600", bg: "bg-purple-50", border: "hover:border-purple-200", roles: ['student', 'teacher', 'admin', 'moderator'] },
                    { href: "/olympiad", icon: GraduationCap, label: "Olympiad Prep", color: "text-teal-600", bg: "bg-teal-50", border: "hover:border-teal-200", roles: ['student', 'teacher', 'admin', 'moderator'] },
                    { href: "/services/new", icon: PlusCircle, label: "Post Service", color: "text-green-600", bg: "bg-green-50", border: "hover:border-green-200", roles: ['teacher', 'admin', 'moderator'] },
                    { href: "/leaderboard", icon: Trophy, label: "Leaderboard", color: "text-amber-600", bg: "bg-amber-50", border: "hover:border-amber-200", roles: ['student', 'teacher', 'admin', 'moderator'] },
                ].filter(action => action.roles.includes(profile?.role || 'student')).map((action, idx) => (
                    <Link key={idx} href={action.href}>
                        <Card className={`h-full border border-transparent shadow-sm hover:shadow-md transition-all duration-300 ${action.border}`}>
                            <CardContent className="flex flex-col items-center justify-center p-5 text-center h-full gap-2">
                                <div className={`p-3 rounded-full ${action.bg} ${action.color}`}>
                                    <action.icon className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-sm text-slate-700">{action.label}</span>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Official Announcements */}
            <section className="space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <Megaphone className="w-5 h-5 text-indigo-600" /> Announcements
                    </h2>
                    <Link href="/announcements" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center">
                        View all <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>

                {announcements.length > 0 ? (
                    <div className="grid md:grid-cols-3 gap-3">
                        {announcements.map(announcement => (
                            <Link key={announcement.id} href="/announcements">
                                <div className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 space-y-2 cursor-pointer h-full">
                                    <div className="flex items-center gap-2">
                                        {announcement.pinned && <Pin className="w-3.5 h-3.5 text-indigo-500" />}
                                        <CategoryBadge category={announcement.category} />
                                    </div>
                                    <h3 className="font-bold text-slate-900 line-clamp-2 text-sm group-hover:text-indigo-600 transition-colors">
                                        {announcement.title}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50 rounded-xl p-10 text-center text-slate-400 border border-dashed">
                        <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No announcements yet.
                    </div>
                )}
            </section>

            {/* Two-column layout: Events + Services side by side */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* Upcoming Events */}
                <section className="space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <Calendar className="w-5 h-5 text-purple-600" /> Upcoming Events
                        </h2>
                        <Link href="/events" className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center">
                            View all <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {events && events.length > 0 ? (
                            events.map(event => (
                                <Link key={event.id} href={`/events/${event.id}`}>
                                    <div className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 flex gap-4 cursor-pointer mb-3">
                                        <div className="bg-purple-50 text-purple-700 rounded-lg w-14 h-14 flex flex-col items-center justify-center shrink-0">
                                            <span className="text-[10px] font-bold uppercase">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-xl font-bold leading-none">{new Date(event.event_date).getDate()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 truncate group-hover:text-purple-600 transition-colors">{event.title}</h3>
                                            <p className="text-sm text-slate-500 truncate">{event.location || 'Online'}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="bg-slate-50 rounded-xl p-10 text-center text-slate-400 border border-dashed">
                                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                No upcoming events found.
                            </div>
                        )}
                    </div>
                </section>

                {/* Featured Services */}
                <section className="space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <PlusCircle className="w-5 h-5 text-blue-600" /> Featured Services
                        </h2>
                        <Link href="/services" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                            View all <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {services && services.length > 0 ? (
                            services.map(service => (
                                <Link key={service.id} href={`/services/${service.id}`}>
                                    <div className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex h-28 cursor-pointer mb-3">
                                        <div className="w-28 shrink-0 bg-slate-100 relative overflow-hidden">
                                            {service.image_url ? (
                                                <img src={service.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={service.title} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                                    <span className="text-2xl font-black opacity-20">{service.category?.[0]}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
                                            <div>
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="font-bold text-slate-900 line-clamp-1 text-sm group-hover:text-blue-600 transition-colors">{service.title}</h3>
                                                    <span className="font-bold text-green-600 text-sm whitespace-nowrap">{service.price > 0 ? `${service.price} ₸` : 'Free'}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{service.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-auto">
                                                <Avatar className="w-5 h-5">
                                                    <AvatarImage src={service.profiles?.avatar_url} />
                                                    <AvatarFallback className="text-[8px]">{service.profiles?.full_name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-[11px] font-medium text-slate-600 truncate">{service.profiles?.full_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="bg-slate-50 rounded-xl p-10 text-center text-slate-400 border border-dashed">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                No services found. Be the first to post!
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
