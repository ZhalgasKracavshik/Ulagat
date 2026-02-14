import { Service } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Clock, Star, User } from "lucide-react";
import Image from "next/image";

interface ServiceCardProps {
    service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
    return (
        <Card className="overflow-hidden transition-all hover:shadow-lg group">
            <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
                {/* Placeholder image logic since we don't have real images yet */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 text-primary group-hover:scale-105 transition-transform duration-300">
                    {service.image_url ? (
                        <img src={service.image_url} alt={service.title} className="object-cover w-full h-full" />
                    ) : (
                        <Star className="h-12 w-12 opacity-20" />
                    )}
                </div>
                <div className="absolute top-2 right-2">
                    <Badge variant={service.status === 'active' ? 'default' : 'secondary'} className="uppercase text-[10px]">
                        {service.category}
                    </Badge>
                </div>
            </div>
            <CardHeader className="p-4">
                <div className="space-y-1">
                    <h3 className="font-bold leading-tight line-clamp-1 group-hover:text-primary transition-colors">{service.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-muted-foreground">
                        <User className="mr-1 h-3 w-3" />
                        <span className="text-xs">Ulagat Teacher</span>
                    </div>
                    <div className="font-bold text-lg text-primary">
                        ₸{service.price}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
                <Button className="w-full" size="sm">
                    View Details
                </Button>
            </CardFooter>
        </Card>
    );
}
