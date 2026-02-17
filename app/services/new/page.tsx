
import { createService } from "../actions";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewServicePage() {
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
                            <select
                                id="category"
                                name="category"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            >
                                <option value="">Select a category</option>
                                <option value="Math">Math</option>
                                <option value="English">English</option>
                                <option value="Physics">Physics</option>
                                <option value="Music">Music</option>
                                <option value="Coding">Coding</option>
                                <option value="Sports">Sports</option>
                                <option value="Other">Other</option>
                            </select>
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
