
import Link from "next/link";
import { Service, Profile } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Star } from "lucide-react";
import { StartChatButton } from "../messages/StartChatButton";

interface ServiceCardProps {
    service: any;
}

export function ServiceCard({ service }: ServiceCardProps) {
    const owner = service.profiles || {};

    return (
        <Card className="overflow-hidden bg-white hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/10 group flex flex-col h-full">
            <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
                {service.image_url ? (
                    <img
                        src={service.image_url}
                        alt={service.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                        <span className="text-4xl font-bold opacity-20 capitalize">{service.category?.[0] || 'S'}</span>
                    </div>
                )}
                <Badge className="absolute top-2 right-2 bg-white/90 text-black hover:bg-white font-bold shadow-sm">
                    {service.price > 0 ? `${service.price} ₸` : 'Free'}
                </Badge>
            </div>

            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="text-xs font-normal">
                        {service.category || 'General'}
                    </Badge>
                    <div className="flex items-center text-yellow-500 text-xs font-bold gap-1">
                        <Star className="w-3 h-3 fill-yellow-500" />
                        <span>5.0</span>
                    </div>
                </div>
                <Link href={`/services/${service.id}`} className="hover:underline decoration-primary">
                    <h3 className="font-bold text-lg leading-tight line-clamp-2 text-slate-900 group-hover:text-primary transition-colors">
                        {service.title}
                    </h3>
                </Link>
            </CardHeader>

            <CardContent className="p-4 pt-0 text-sm text-slate-500 flex-grow">
                <p className="line-clamp-2 min-h-[40px]">{service.description}</p>
            </CardContent>

            <CardFooter className="p-4 pt-0 flex items-center justify-between mt-auto">
                <Link href={`/profile/${service.owner_id}`} className="flex items-center gap-2 group/author">
                    <Avatar className="w-8 h-8 border border-slate-200">
                        <AvatarImage src={owner.avatar_url || ''} />
                        <AvatarFallback>{owner.full_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-slate-700 group-hover/author:text-primary transition-colors truncate max-w-[100px]">
                        {owner.full_name || 'Anonymous'}
                    </span>
                </Link>

                {/* Integrated Chat Button */}
                <StartChatButton ownerId={service.owner_id} />
            </CardFooter>
        </Card>
    );
}
