
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { updateProfile } from "./actions";
import { AvatarUpload } from "@/components/profile/AvatarUpload";

export default async function EditProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    return (
        <div className="container py-10 max-w-xl">
            <Card>
                <CardHeader>
                    <CardTitle>Edit Your Profile</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={updateProfile} className="space-y-6">

                        <div className="flex justify-center mb-6">
                            {/* We pass a change handler that updates a hidden input, 
                                BUT for simplicity, the AvatarUpload component ITSELF renders a hidden input with name="avatar_url"
                                matching the server action's expectation.
                                So we just need to pass the initial value.
                            */}
                            <AvatarUpload
                                currentAvatarUrl={profile?.avatar_url}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="full_name">Full Name</Label>
                            <Input id="full_name" name="full_name" defaultValue={profile?.full_name || ''} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea
                                id="bio"
                                name="bio"
                                defaultValue={profile?.bio || ''}
                                placeholder="Tell us about yourself..."
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="flex gap-4">
                            <a href="/profile/me" className="w-full">
                                <Button variant="outline" className="w-full" type="button">Cancel</Button>
                            </a>
                            <Button type="submit" className="w-full">Save Changes</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
