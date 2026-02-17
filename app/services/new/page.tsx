
import { createService } from "../actions";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default async function NewServicePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    // Allow Teachers, Admins, Moderators
    const allowedRoles = ['teacher', 'admin', 'moderator'];
    if (!profile || !allowedRoles.includes(profile.role)) {
        return (
            <div className="container py-20 text-center text-destructive">
                <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p>Students cannot post services directly.</p>
                <div className="mt-4">
                    <Button variant="outline" asChild><a href="/services">Back to Services</a></Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-10 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Post a New Service</CardTitle>
                    <CardDescription>
                        Offer your skills to the school community. Listings cost 100 ₸.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={createService} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" name="title" placeholder="e.g. Algebra Tutoring Grade 9" required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select name="category" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select functionality" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tutoring">Tutoring</SelectItem>
                                    <SelectItem value="cleaning">Cleaning</SelectItem>
                                    <SelectItem value="tech-support">Tech Support</SelectItem>
                                    <SelectItem value="delivery">Delivery</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Duration Selection (Visible to everyone, but more options could be added for admins if needed) */}
                        <div className="space-y-2">
                            <Label htmlFor="duration">Duration</Label>
                            <Select name="duration" defaultValue="7">
                                <SelectTrigger>
                                    <SelectValue placeholder="How long should this be visible?" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">7 Days (Default)</SelectItem>
                                    <SelectItem value="14">14 Days</SelectItem>
                                    <SelectItem value="30">30 Days</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Post will auto-expire after this period.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Price (₸)</Label>
                                <Input id="price" name="price" type="number" placeholder="2000" min="0" required />
                            </div>
                            <div className="space-y-2">
                                <Label>Cover Image</Label>
                                <ImageUpload bucketName="service-images" />
                            </div>
                            {/* ImageUpload handles the hidden input for 'image_url' */}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Schedule, experience, etc.)</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="I can help with homework and exam prep. Available Mon-Wed after 3 PM."
                                className="min-h-[120px]"
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full bg-primary font-bold text-lg h-12">
                            Proceed to Payment (100 ₸)
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div >
    );
}
