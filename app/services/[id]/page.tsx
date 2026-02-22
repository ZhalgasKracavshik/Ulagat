
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MessageCircle, Star, Calendar, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewSection } from "@/components/services/ReviewSection";
import { ContactTutorButton } from "@/components/shared/ContactTutorButton";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ServiceDetailsPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: service } = await supabase
        .from('services')
        .select('*, profiles:owner_id(*)')
        .eq('id', id)
        .single();

    const { data: { user } } = await supabase.auth.getUser();
    let profile = null;
    if (user) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        profile = p;
    }

    if (!service) return notFound();

    return (
        <div className="container py-12 max-w-3xl mx-auto px-4">
            <Link href="/services" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Services
            </Link>

            <div className="space-y-10">
                {/* Header & Hero */}
                <div className="space-y-6">
                    <div className="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden border shadow-sm">
                        {service.image_url ? (
                            <img src={service.image_url} alt={service.title} className="object-cover w-full h-full" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <span className="text-8xl font-bold opacity-10">{service.category?.[0]}</span>
                            </div>
                        )}
                        <div className="absolute top-4 right-4">
                            <Badge variant="secondary" className="bg-white/90 backdrop-blur shadow-sm px-4 py-1 text-sm font-bold">
                                {service.category}
                            </Badge>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{service.title}</h1>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center text-amber-500 font-bold gap-1">
                                    <Star className="w-5 h-5 fill-amber-500" />
                                    <span>5.0</span>
                                </div>
                                <span className="text-slate-400">•</span>
                                <span className="text-muted-foreground">0 reviews</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="text-3xl font-black text-primary">
                                {service.price > 0 ? `${service.price} ₸` : 'Free'}
                            </div>
                            {(user?.id === service.owner_id || ['admin', 'moderator'].includes(profile?.role)) && (
                                <form action={async () => {
                                    "use server";
                                    const { deleteService } = await import("../actions");
                                    await deleteService(id);
                                }} className="mt-2">
                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-red-50 hover:text-red-700">
                                        Delete Service
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="grid grid-cols-1 gap-12">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-slate-900">About this service</h3>
                        <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-wrap">
                            {service.description}
                        </p>
                    </div>

                    {/* Integrated Provider Card */}
                    <Card className="border-0 bg-slate-50/50 overflow-hidden">
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="flex items-center gap-6">
                                    <Avatar className="w-20 h-20 border-4 border-white shadow-xl">
                                        <AvatarImage src={service.profiles?.avatar_url} />
                                        <AvatarFallback className="text-2xl font-bold">{service.profiles?.full_name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Provided By</p>
                                        <h4 className="text-2xl font-bold text-slate-900">{service.profiles?.full_name}</h4>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                            <span className="capitalize bg-white px-2 py-0.5 rounded border text-[10px] font-bold">
                                                {service.profiles?.role || 'Student'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Since {new Date(service.profiles?.created_at).getFullYear()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-auto flex flex-col gap-3">
                                    <ContactTutorButton
                                        otherUserId={service.owner_id}
                                        currentUserId={user?.id || null}
                                    />
                                    <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-slate-400 font-medium">
                                        <Clock className="w-3 h-3" />
                                        Avg. Response: ~1 hour
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="pt-8 border-t">
                        <ReviewSection serviceId={id} />
                    </div>
                </div>
            </div>
        </div>
    );
}
