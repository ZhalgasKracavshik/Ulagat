
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
import { SERVICE_CATEGORIES, SERVICE_CREATOR_ROLES } from "@/lib/services";

export default async function NewServicePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    // Allow Teachers, Admins, Moderators and Parliament (Phase 5)
    const allowedRoles: readonly string[] = SERVICE_CREATOR_ROLES;
    if (!profile || !allowedRoles.includes(profile.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
                <Card className="max-w-md w-full border-0 shadow-2xl text-center p-8 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Access Denied</CardTitle>
                    <p className="text-muted-foreground">Students cannot post listings directly. This feature is for teachers, staff and parliament members.</p>
                    <Button variant="outline" className="w-full mt-4" asChild>
                        <a href="/services">Back to Bulletin Board</a>
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/50 py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Post to the Bulletin Board</h1>
                    <p className="text-muted-foreground">Offer courses, tutoring, internships or mentorship to the school community.</p>
                </div>

                <Card className="border-0 shadow-xl shadow-indigo-100/50 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Listing Details</CardTitle>
                        <CardDescription>
                            Posting is free. Listings are reviewed by moderators before going live.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={createService} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-sm font-semibold text-foreground">Title</Label>
                                <Input id="title" name="title" placeholder="e.g. Algebra Tutoring Grade 9" required className="h-11 border-border focus:ring-indigo-500 rounded-lg shadow-sm" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="text-sm font-semibold text-foreground">Category</Label>
                                    <Select name="category" required>
                                        <SelectTrigger className="h-11 border-border rounded-lg shadow-sm">
                                            <SelectValue placeholder="Select functionality" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SERVICE_CATEGORIES.map((cat) => (
                                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="duration" className="text-sm font-semibold text-foreground">Duration</Label>
                                    <Select name="duration" defaultValue="7">
                                        <SelectTrigger className="h-11 border-border rounded-lg shadow-sm">
                                            <SelectValue placeholder="Listing active for..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="7">7 Days (Standard)</SelectItem>
                                            <SelectItem value="14">14 Days</SelectItem>
                                            <SelectItem value="30">30 Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <div className="space-y-2">
                                    <Label htmlFor="price" className="text-sm font-semibold text-foreground">Price (₸)</Label>
                                    <Input id="price" name="price" type="number" placeholder="2000" min="0" required className="h-11 border-border rounded-lg shadow-sm" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">Cover Image</Label>
                                    <ImageUpload bucketName="service-images" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="I can help with homework and exam prep. Available Mon-Wed after 3 PM."
                                    className="min-h-[120px] border-border focus:ring-indigo-500 resize-none rounded-lg shadow-sm"
                                    required
                                />
                                <p className="text-xs text-muted-foreground text-right italic">Include schedule, experience, and what's included.</p>
                            </div>

                            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg h-14 rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4">
                                Submit for Review
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
