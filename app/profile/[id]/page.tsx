
import { createClient } from "@/lib/supabase/server";
import { TrustChain } from "@/components/reputation/TrustChain";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Need to create Avatar if missing
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Need to create Tabs if missing
import { Crown, Mail, Phone, MapPin } from "lucide-react";

interface PageProps {
    params: Promise<{ id: string }>;
}


export default async function ProfilePage({ params }: PageProps) {
    let { id } = await params;
    const supabase = await createClient();

    // Handle "me" shortcut
    if (id === 'me') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // Redirect to login if checking own profile but not logged in
            // In server component we can use redirect from next/navigation
            return (
                <div className="container py-20 text-center">
                    <p className="mb-4">You need to be logged in to view your profile.</p>
                    <a href="/login" className="px-4 py-2 bg-primary text-white rounded">Login</a>
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
        return <div>User not found</div>;
    }

    // Fetch Services
    const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('owner_id', id);

    return (
        <div className="container py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start bg-card p-8 rounded-xl shadow-sm border relative">
                {/* Edit Button for Owner */}
                {id === (await supabase.auth.getUser()).data.user?.id && (
                    <a href="/profile/edit" className="absolute top-4 right-4 text-sm text-primary hover:underline border border-primary/20 px-3 py-1 rounded-full bg-primary/5">
                        Edit Profile
                    </a>
                )}

                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/10 relative">
                    {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center text-4xl font-bold text-slate-400">
                            {profile.full_name?.[0] || '?'}
                        </div>
                    )}
                </div>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                        <Badge variant="outline" className="capitalize">{profile.role}</Badge>
                        <Badge className="bg-yellow-500 hover:bg-yellow-600">
                            Blockchain Verified
                        </Badge>
                    </div>
                    <p className="text-muted-foreground max-w-md">
                        {profile.bio || "No bio yet. Click 'Edit Profile' to introduce yourself!"}
                    </p>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold mb-4">Services & Activity</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {services && services.map(service => (
                            <Card key={service.id}>
                                <CardHeader>
                                    <CardTitle className="text-lg">{service.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-sm line-clamp-2">{service.description}</p>
                                    <div className="mt-4 font-bold text-primary">{service.price} KZT</div>
                                </CardContent>
                            </Card>
                        ))}
                        {(!services || services.length === 0) && (
                            <div className="col-span-full text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                                No active services.
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar: Trust Chain */}
                <div className="space-y-6">
                    <Card className="bg-slate-50/50 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Crown className="w-5 h-5 text-yellow-500" />
                                Smart Reputation
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TrustChain userId={id} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
