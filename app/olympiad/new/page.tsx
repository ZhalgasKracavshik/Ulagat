
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { addStudyMaterial } from "../actions";
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
import { ShieldAlert } from "lucide-react";
import { InteractiveButton } from "@/components/shared/InteractiveButton";

export default async function NewMaterialPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
        return (
            <div className="container py-20 text-center text-destructive">
                <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p>Only Admins and Moderators can add study materials.</p>
                <Button className="mt-4" variant="outline" asChild><a href="/olympiad">Back</a></Button>
            </div>
        );
    }

    return (
        <div className="container py-10 max-w-2xl">
            <Card className="border-indigo-200">
                <CardHeader>
                    <CardTitle className="text-indigo-900">Add Study Material</CardTitle>
                    <CardDescription>
                        Add a resource, problem set, or study guide for olympiad preparation.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={addStudyMaterial} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" name="title" placeholder="e.g. Math Olympiad 2025 — Set A Problems" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">Subject</Label>
                                <Select name="category" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Math">Math</SelectItem>
                                        <SelectItem value="Physics">Physics</SelectItem>
                                        <SelectItem value="Chemistry">Chemistry</SelectItem>
                                        <SelectItem value="Biology">Biology</SelectItem>
                                        <SelectItem value="Informatics">Informatics</SelectItem>
                                        <SelectItem value="English">English</SelectItem>
                                        <SelectItem value="History">History</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="difficulty">Difficulty</Label>
                                <Select name="difficulty" defaultValue="medium">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select difficulty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easy">Easy</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="hard">Hard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="url">Resource URL (optional)</Label>
                            <Input id="url" name="url" type="url" placeholder="https://docs.google.com/..." />
                            <p className="text-xs text-muted-foreground">Link to a Google Doc, PDF, or external resource.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Describe the resource, include sample questions if applicable..."
                                className="min-h-[120px]"
                            />
                        </div>

                        <InteractiveButton type="submit" loadingText="Publishing..." className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold text-lg h-12">
                            Publish Resource
                        </InteractiveButton>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
