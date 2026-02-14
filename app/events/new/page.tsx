
import { createEvent } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewEventPage() {
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
