
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MessageCircle, Star, Calendar, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewSection } from "@/components/services/ReviewSection";

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

    if (!service) return notFound();

    return (
        <div className="container py-8 max-w-4xl">
            <Link href="/services" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Services
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <div className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden border">
                        {service.image_url ? (
                            <img src={service.image_url} alt={service.title} className="object-cover w-full h-full" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <span className="text-6xl font-bold opacity-20">{service.category?.[0]}</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900">{service.title}</h1>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="secondary">{service.category}</Badge>
                                    <div className="flex items-center text-yellow-500 text-sm font-bold gap-1">
                                        <Star className="w-4 h-4 fill-yellow-500" />
                                        <span>5.0</span>
                                        <span className="text-muted-foreground font-normal">(0 reviews)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-primary">
                                {service.price > 0 ? `${service.price} ₸` : 'Free'}
                            </div>
                        </div>
                    </div>

                    <div className="prose max-w-none text-slate-600">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">About this service</h3>
                        <p className="whitespace-pre-wrap leading-relaxed">{service.description}</p>
                    </div>

                    <div className="pt-8 border-t">
                        <ReviewSection serviceId={id} />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Provided By</h3>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <Link href={`/profile/${service.owner_id}`} className="flex items-center gap-3 group">
                                <Avatar className="w-12 h-12 border">
                                    <AvatarImage src={service.profiles?.avatar_url} />
                                    <AvatarFallback>{service.profiles?.full_name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold group-hover:text-primary transition-colors">{service.profiles?.full_name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{service.profiles?.role || 'Student'}</p>
                                </div>
                            </Link>

                            <Button className="w-full mt-4 gap-2 font-bold shadow-lg shadow-primary/20">
                                <MessageCircle className="w-4 h-4" />
                                Contact Tutor
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-input">
                        <CardContent className="pt-6 space-y-3">
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Clock className="w-4 h-4 text-primary" />
                                <span>Response time: ~1 hour</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span>Member since {new Date(service.profiles?.created_at).getFullYear()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
