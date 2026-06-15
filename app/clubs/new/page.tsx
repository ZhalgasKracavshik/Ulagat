import { createClub } from "../actions";
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
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { CLUB_CATEGORIES, CLUB_CATEGORY_LABELS, CLUB_CREATOR_ROLES } from "@/lib/clubs";

type LeaderCandidate = {
    id: string;
    full_name: string | null;
    role: string;
    grade: number | null;
    class_letter: string | null;
};

export default async function NewClubPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const allowedRoles: readonly string[] = CLUB_CREATOR_ROLES;
    if (!profile || !allowedRoles.includes(profile.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
                <Card className="max-w-md w-full border-0 shadow-2xl text-center p-8 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Access Denied</CardTitle>
                    <p className="text-muted-foreground">Only Parliament members, Moderators and Admins can create clubs.</p>
                    <Button variant="outline" className="w-full mt-4" asChild>
                        <Link href="/clubs">Back to Clubs</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    const isStaff = profile.role === 'moderator' || profile.role === 'admin';

    // Moderators/admins can delegate leadership to a parliament member or student.
    let leaderCandidates: LeaderCandidate[] = [];
    if (isStaff) {
        const { data: candidates } = await supabase
            .from('profiles')
            .select('id, full_name, role, grade, class_letter')
            .in('role', ['parliament', 'student'])
            .order('role', { ascending: false }) // parliament first
            .order('full_name', { ascending: true })
            .limit(100);
        leaderCandidates = (candidates ?? []) as LeaderCandidate[];
    }

    return (
        <div className="min-h-screen bg-muted/50 py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Create a Club</h1>
                    <p className="text-muted-foreground">Start a new community at BINOM and earn points for every meeting.</p>
                </div>

                <Card className="border-0 shadow-xl shadow-violet-100/50 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Club Details</CardTitle>
                        <CardDescription>
                            {isStaff
                                ? "You can assign any parliament member or student as the club leader."
                                : "You will automatically become the leader of this club."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={createClub} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-semibold text-foreground">Club Name</Label>
                                <Input id="name" name="name" placeholder="e.g. BINOM Debate Society" required maxLength={120} className="h-11 border-border focus:ring-violet-500 rounded-lg shadow-sm" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="text-sm font-semibold text-foreground">Category</Label>
                                    <Select name="category" required>
                                        <SelectTrigger id="category" className="h-11 border-border rounded-lg shadow-sm w-full">
                                            <SelectValue placeholder="Pick a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CLUB_CATEGORIES.map((category) => (
                                                <SelectItem key={category} value={category}>
                                                    {CLUB_CATEGORY_LABELS[category]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {isStaff && (
                                    <div className="space-y-2">
                                        <Label htmlFor="leader_id" className="text-sm font-semibold text-foreground">Club Leader</Label>
                                        <Select name="leader_id">
                                            <SelectTrigger id="leader_id" className="h-11 border-border rounded-lg shadow-sm w-full">
                                                <SelectValue placeholder="Select a leader (default: you)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {leaderCandidates.map((candidate) => (
                                                    <SelectItem key={candidate.id} value={candidate.id}>
                                                        {candidate.full_name || 'Unnamed'}
                                                        {candidate.role === 'parliament'
                                                            ? ' — Parliament'
                                                            : candidate.grade
                                                                ? ` — Grade ${candidate.grade}${candidate.class_letter ?? ''}`
                                                                : ' — Student'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[11px] text-muted-foreground italic">Leave empty to lead the club yourself.</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="What does your club do? When do you meet? Who should join?"
                                    className="min-h-[120px] border-border focus:ring-violet-500 resize-none rounded-lg shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-foreground">Club Logo (optional)</Label>
                                <div className="border border-dashed border-border rounded-lg p-2 bg-muted/50">
                                    <ImageUpload bucketName="club-logos" />
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg h-14 rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4">
                                Create Club
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
