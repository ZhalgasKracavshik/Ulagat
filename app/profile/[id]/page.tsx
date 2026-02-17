
import { createClient } from "@/lib/supabase/server";
import { TrustChain } from "@/components/reputation/TrustChain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Star, MapPin, Calendar, Edit, ShieldCheck } from "lucide-react";
import { ServiceCard } from "@/components/services/ServiceCard"; // Reusing ServiceCard
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
    let { id } = await params;
    const supabase = await createClient();

    // Handle "me" shortcut
    let currentUser = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) currentUser = user;

    if (id === 'me') {
        if (!user) {
            return (
                <div className="container py-20 text-center">
                    <p className="mb-4 text-lg text-muted-foreground">Please log in to view your profile.</p>
                    <Link href="/login" className="px-6 py-2 bg-primary text-white rounded-full font-medium">Log In</Link>
                </div>
            );
        }
        id = user.id;
    }

    // Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

    if (!profile) {
        return <div className="container py-20 text-center text-xl">User not found 😕</div>;
    }

    const isOwner = currentUser?.id === profile.id;

    // Fetch Services
    const { data: services } = await supabase
        .from('services')
        .select('*, profiles:owner_id(*)') // Determine if we need to join profile again? ServiceCard might need it.
        .eq('owner_id', id)
        .eq('status', 'active');

    // Fetch Events (if teacher/admin)
    const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', id);

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header / Cover Area */}
            <div className="bg-white border-b">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                        {/* Avatar */}
                        <div className="relative group">
                            <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-white shadow-lg">
                                <AvatarImage src={profile.avatar_url} className="object-cover" />
                                <AvatarFallback className="text-4xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                                    {profile.full_name?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                            </Avatar>
                            {isOwner && (
                                <Link href="/profile/edit" className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border hover:bg-slate-50 text-slate-600">
                                    <Edit className="w-4 h-4" />
                                </Link>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left space-y-3">
                            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                                <h1 className="text-3xl font-bold text-slate-900">{profile.full_name}</h1>

                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="capitalize px-3 py-1">
                                        {profile.role}
                                    </Badge>
                                    {/* Placeholder for Blockchain verification status logic */}
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1">
                                        <ShieldCheck className="w-3 h-3" />
                                        Verified Member
                                    </Badge>
                                </div>
                            </div>

                            <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
                                {profile.bio || "This user hasn't written a bio yet."}
                            </p>

                            {/* Quick Stats Row (Mocked for now) */}
                            <div className="flex items-center justify-center md:justify-start gap-6 pt-2 text-sm text-slate-500">
                                <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="font-semibold text-slate-900">0</span> Reviews
                                </div>
                                <div className="flex items-center gap-1">
                                    <Crown className="w-4 h-4 text-indigo-500" />
                                    <span className="font-semibold text-slate-900">0</span> Reputation
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    Joined 2026
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            {!isOwner && (
                                <Link href={`/messages/${profile.id}`}>
                                    <button className="bg-primary text-white px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
                                        Message
                                    </button>
                                </Link>
                            )}
                            {isOwner && (
                                <Link href="/profile/edit">
                                    <button className="border border-slate-300 bg-white text-slate-700 px-6 py-2 rounded-full font-medium hover:bg-slate-50 transition-colors">
                                        Edit Profile
                                    </button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Content */}
            <div className="container mx-auto px-4 py-8">
                <Tabs defaultValue="services" className="space-y-6">
                    <TabsList className="w-full md:w-auto grid grid-cols-2 md:inline-flex h-12 items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-500">
                        <TabsTrigger value="services" className="rounded-md px-6 py-2">Services</TabsTrigger>
                        {profile.role !== 'student' && <TabsTrigger value="events" className="rounded-md px-6 py-2">Events</TabsTrigger>}
                        <TabsTrigger value="reputation" className="rounded-md px-6 py-2">Reputation & Chain</TabsTrigger>
                    </TabsList>

                    <TabsContent value="services" className="space-y-6 animate-in fade-in-50 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {services && services.length > 0 ? (
                                services.map((service: any) => (
                                    <ServiceCard key={service.id} service={service} />
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed">
                                    <p className="text-muted-foreground">No active services.</p>
                                    {isOwner && (
                                        <Link href="/services/new" className="text-primary font-medium hover:underline mt-2 inline-block">
                                            Create a Service &rarr;
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="events" className="space-y-6 animate-in fade-in-50 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events && events.length > 0 ? (
                                events.map((event: any) => (
                                    <Card key={event.id} className="overflow-hidden hover:shadow-md transition-all">
                                        <div className="h-32 bg-gradient-to-r from-blue-500 to-cyan-500" />
                                        <CardHeader>
                                            <CardTitle>{event.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <Badge variant="secondary">{event.location}</Badge>
                                                <Badge variant="outline">{new Date(event.event_date).toLocaleDateString()}</Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed">
                                    <p className="text-muted-foreground">No events hosted yet.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="reputation" className="animate-in fade-in-50 duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-6">
                                <Card className="bg-gradient-to-b from-slate-900 to-slate-800 text-white border-0 shadow-xl">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Crown className="w-5 h-5 text-yellow-400" />
                                            Trust Score
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-5xl font-extrabold text-center py-6">
                                            {/* Mock Score - Replace with real calculation */}
                                            100
                                        </div>
                                        <p className="text-center text-slate-400 text-sm">
                                            Reputation Point
                                        </p>
                                    </CardContent>
                                </Card>

                                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 text-sm">
                                    <strong>What is this?</strong><br />
                                    This is your decentralized reputation score. Every completed service and verified event adds a block to your personal Trust Chain.
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Blockchain Ledger</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <TrustChain userId={profile.id} />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
