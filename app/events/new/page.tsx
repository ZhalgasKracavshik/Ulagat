
import { createEvent } from "../actions";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default async function NewEventPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
        return (
            <div className="container py-20 text-center text-destructive">
                <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p>Only Admins and Moderators can create events.</p>
                <Button className="mt-4" variant="outline" asChild><a href="/events">Back to Events</a></Button>
            </div>
        );
    }
    return (
        <div className="container py-10 max-w-2xl">
            <Card className="border-blue-200">
                <CardHeader>
                    <CardTitle className="text-blue-900">Host an Event / Olympiad</CardTitle>
                    <CardDescription>
                        Organize a competition or workshop for the school.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={createEvent} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Event Title</Label>
                            <Input id="title" name="title" placeholder="e.g. Math Olympiad Spring 2026" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="event_date">Date & Time</Label>
                                <Input id="event_date" name="event_date" type="datetime-local" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input id="location" name="location" placeholder="e.g. Auditorium" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="image">Cover Image</Label>
                            <div className="border-2 border-dashed rounded-lg p-4 text-center">
                                <ImageUpload bucketName="event-images" />
                            </div>
                        </div>

                        {/* Duration Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="duration">Duration</Label>
                            <Select name="duration" defaultValue="30">
                                <SelectTrigger>
                                    <SelectValue placeholder="How long should this be visible?" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">7 Days</SelectItem>
                                    <SelectItem value="14">14 Days</SelectItem>
                                    <SelectItem value="30">30 Days (Default)</SelectItem>
                                    <SelectItem value="60">60 Days</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Post will auto-expire after this period.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description & Rules</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Describe the event, rules, and prizes..."
                                className="min-h-[120px]"
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold text-lg h-12">
                            Publish Event
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
