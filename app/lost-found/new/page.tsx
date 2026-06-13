import { createLostItem } from "../actions";
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
import { ShieldAlert, Search, PackageCheck } from "lucide-react";
import { LOST_ITEM_CATEGORIES, LOST_ITEM_CATEGORY_LABELS, LOST_ITEM_POSTER_ROLES } from "@/lib/lost-found";

export const dynamic = 'force-dynamic';

export default async function NewLostItemPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login?next=/lost-found/new');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const allowedRoles: readonly string[] = LOST_ITEM_POSTER_ROLES;
    if (!profile || !allowedRoles.includes(profile.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/50">
                <Card className="max-w-md w-full border-0 shadow-2xl text-center p-8 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Access Denied</CardTitle>
                    <p className="text-slate-600">You are not allowed to post lost &amp; found items.</p>
                    <Button variant="outline" className="w-full mt-4" asChild>
                        <Link href="/lost-found">Back to Lost &amp; Found</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Post an Item</h1>
                    <p className="text-slate-500">Lost something or found something on campus? Let the school know.</p>
                </div>

                <Card className="border-0 shadow-xl shadow-teal-100/50 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Item Details</CardTitle>
                        <CardDescription>
                            Add a clear photo and where it was last seen — it helps reunite items with owners.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={createLostItem} className="space-y-6">
                            {/* Lost vs found */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Are you reporting a lost or a found item?</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="relative flex flex-col items-center gap-1 rounded-xl border-2 border-slate-200 p-4 cursor-pointer transition-all hover:border-teal-300 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50">
                                        <input type="radio" name="status" value="lost" className="sr-only peer" />
                                        <Search className="w-6 h-6 text-amber-500" />
                                        <span className="font-bold text-slate-800">I lost this</span>
                                        <span className="text-[11px] text-slate-500 text-center">I&apos;m looking for it</span>
                                    </label>
                                    <label className="relative flex flex-col items-center gap-1 rounded-xl border-2 border-slate-200 p-4 cursor-pointer transition-all hover:border-teal-300 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50">
                                        <input type="radio" name="status" value="found" className="sr-only peer" defaultChecked />
                                        <PackageCheck className="w-6 h-6 text-blue-500" />
                                        <span className="font-bold text-slate-800">I found this</span>
                                        <span className="text-[11px] text-slate-500 text-center">Returning it to its owner</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-sm font-semibold text-slate-700">Title</Label>
                                <Input id="title" name="title" placeholder="e.g. Black iPhone with cracked screen" required maxLength={120} className="h-11 border-slate-200 focus:ring-teal-500 rounded-lg shadow-sm" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="text-sm font-semibold text-slate-700">Category</Label>
                                    <Select name="category" required>
                                        <SelectTrigger id="category" className="h-11 border-slate-200 rounded-lg shadow-sm w-full">
                                            <SelectValue placeholder="Pick a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LOST_ITEM_CATEGORIES.map((category) => (
                                                <SelectItem key={category} value={category}>
                                                    {LOST_ITEM_CATEGORY_LABELS[category]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location" className="text-sm font-semibold text-slate-700">Location</Label>
                                    <Input id="location" name="location" placeholder="e.g. 2nd floor cafeteria" maxLength={160} className="h-11 border-slate-200 focus:ring-teal-500 rounded-lg shadow-sm" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-semibold text-slate-700">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="Any distinguishing details — color, brand, stickers, contents…"
                                    maxLength={2000}
                                    className="min-h-[120px] border-slate-200 focus:ring-teal-500 resize-none rounded-lg shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Photo (optional)</Label>
                                <div className="border border-dashed border-slate-300 rounded-lg p-2 bg-slate-50/50">
                                    <ImageUpload bucketName="lost-found" />
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg h-14 rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4">
                                Post Item
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
