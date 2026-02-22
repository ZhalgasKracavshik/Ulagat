
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { updateProfile } from "./actions";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { SocialLinksEditor } from "@/components/profile/SocialLinksEditor";

export default async function EditProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    // Parse existing social links
    const socialLinks = profile?.social_links || [];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10 px-4">
            <div className="mx-auto max-w-2xl space-y-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Edit Your Profile</h1>
                    <p className="text-muted-foreground mt-2">Make your profile stand out in the Ulagat community.</p>
                </div>

                <form action={updateProfile} className="space-y-6">
                    {/* Avatar Section */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Profile Photo</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <AvatarUpload currentAvatarUrl={profile?.avatar_url} />
                        </CardContent>
                    </Card>

                    {/* Basic Info */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input
                                    id="full_name"
                                    name="full_name"
                                    defaultValue={profile?.full_name || ''}
                                    required
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea
                                    id="bio"
                                    name="bio"
                                    defaultValue={profile?.bio || ''}
                                    placeholder="Tell us about yourself, your interests, and what you teach or study..."
                                    className="min-h-[120px] resize-none"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Social Links */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Social Links</CardTitle>
                            <CardDescription>Add links to your social media profiles. You choose which networks to display.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SocialLinksEditor initialLinks={socialLinks} />
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                        <a href="/profile/me" className="w-full">
                            <Button variant="outline" className="w-full h-12 text-base" type="button">Cancel</Button>
                        </a>
                        <Button type="submit" className="w-full h-12 text-base font-bold">Save Changes</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
