import { Event } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Star } from "lucide-react";
import Image from "next/image";

interface EventCardProps {
    event: Event;
}

export function EventCard({ event }: EventCardProps) {
    return (
        <Card className="flex flex-col overflow-hidden hover:shadow-lg transition-all h-full">
            <div className="relative h-48 w-full bg-muted">
                {event.image_url ? (
                    <img src={event.image_url} alt={event.title} className="object-cover w-full h-full" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                        <Calendar className="h-16 w-16 text-white/50" />
                    </div>
                )}
                <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                    {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
            </div>
            <CardHeader>
                <CardTitle className="line-clamp-1">{event.title}</CardTitle>
                <CardDescription className="flex items-center mt-1">
                    <MapPin className="mr-1 h-3 w-3" />
                    {event.location}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">
                    {event.description}
                </p>
            </CardContent>
            <CardFooter>
                <Button variant="outline" className="w-full">Register Now</Button>
            </CardFooter>
        </Card>
    );
}
