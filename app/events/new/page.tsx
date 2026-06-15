
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
import { EVENT_CREATOR_ROLES, EVENT_TAGS } from "@/lib/events";

export default async function NewEventPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    const allowedRoles: readonly string[] = EVENT_CREATOR_ROLES;
    if (!profile || !allowedRoles.includes(profile.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
                <Card className="max-w-md w-full border-0 shadow-2xl text-center p-8 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Access Denied</CardTitle>
                    <p className="text-muted-foreground">Only Teachers, Admins, Moderators and Parliament members can create events/olympiads.</p>
                    <Button variant="outline" className="w-full mt-4" asChild>
                        <a href="/events">Back to Events</a>
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/50 py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Host an Event / Olympiad</h1>
                    <p className="text-muted-foreground">Organize a competition or workshop for the school community.</p>
                </div>

                <Card className="border-0 shadow-xl shadow-blue-100/50 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Event Details</CardTitle>
                        <CardDescription>
                            Fill in the details to announce your event.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={createEvent} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-sm font-semibold text-foreground">Event Title</Label>
                                <Input id="title" name="title" placeholder="e.g. Math Olympiad Spring 2026" required className="h-11 border-border focus:ring-blue-500 rounded-lg shadow-sm" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="event_date" className="text-sm font-semibold text-foreground">Date & Time</Label>
                                    <Input id="event_date" name="event_date" type="datetime-local" required className="h-11 border-border focus:ring-blue-500 rounded-lg shadow-sm" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location" className="text-sm font-semibold text-foreground">Location</Label>
                                    <Input id="location" name="location" placeholder="e.g. Auditorium" className="h-11 border-border focus:ring-blue-500 rounded-lg shadow-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="registration_deadline" className="text-sm font-semibold text-foreground">Registration Deadline (optional)</Label>
                                    <Input id="registration_deadline" name="registration_deadline" type="date" className="h-11 border-border focus:ring-blue-500 rounded-lg shadow-sm" />
                                    <p className="text-[11px] text-muted-foreground italic">Participants get an email reminder the day before the event.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">Tags</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {EVENT_TAGS.map((tag) => (
                                            <label key={tag} className="cursor-pointer">
                                                <input type="checkbox" name="tags" value={tag} className="peer sr-only" />
                                                <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold border border-border bg-muted text-muted-foreground transition-all peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 capitalize">
                                                    {tag}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <div className="space-y-2">
                                    <Label htmlFor="max_students" className="text-sm font-semibold text-foreground">Max Students (optional)</Label>
                                    <Input id="max_students" name="max_students" type="number" min="1" placeholder="e.g. 30" className="h-11 border-border focus:ring-blue-500 rounded-lg shadow-sm" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground text-center block">Cover Image</Label>
                                    <div className="border border-dashed border-border rounded-lg p-2 bg-muted/50">
                                        <ImageUpload bucketName="event-images" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="duration" className="text-sm font-semibold text-foreground">Visibility Duration</Label>
                                <Select name="duration" defaultValue="30">
                                    <SelectTrigger className="h-11 border-border rounded-lg shadow-sm">
                                        <SelectValue placeholder="How long should this be visible?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">7 Days</SelectItem>
                                        <SelectItem value="14">14 Days</SelectItem>
                                        <SelectItem value="30">30 Days (Default)</SelectItem>
                                        <SelectItem value="60">60 Days</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] text-muted-foreground italic">Post will auto-expire and be archived after this period.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description & Rules</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="Describe the event, rules, and prizes..."
                                    className="min-h-[120px] border-border focus:ring-blue-500 resize-none rounded-lg shadow-sm"
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg h-14 rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4">
                                Publish Event
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
