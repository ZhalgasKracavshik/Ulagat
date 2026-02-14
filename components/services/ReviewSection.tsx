
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { addReview } from "@/app/services/[id]/actions";
import { createClient } from "@/lib/supabase/server";

export async function ReviewSection({ serviceId }: { serviceId: string }) {
    const supabase = await createClient();

    // Fetch reviews
    const { data: reviews } = await supabase
        .from('reviews')
        .select('*, profiles:reviewer_id(*)')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="space-y-8">
            <h3 className="text-2xl font-bold">Reviews ({reviews?.length || 0})</h3>

            {/* List Reviews */}
            <div className="space-y-4">
                {reviews && reviews.length > 0 ? (
                    reviews.map((review: any) => (
                        <div key={review.id} className="flex gap-4 p-4 bg-slate-50 rounded-lg border">
                            <Avatar>
                                <AvatarImage src={review.profiles?.avatar_url} />
                                <AvatarFallback>{review.profiles?.full_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold">{review.profiles?.full_name}</span>
                                    <div className="flex text-yellow-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-slate-300'}`} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-slate-600 text-sm">{review.comment}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-muted-foreground italic">No reviews yet. Be the first!</p>
                )}
            </div>

            {/* Add Review Form */}
            {user ? (
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h4 className="font-bold mb-4">Leave a Review</h4>
                    <form action={addReview.bind(null, serviceId)} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Rating</label>
                            <select name="rating" className="w-full border rounded-md p-2 text-sm bg-background">
                                <option value="5">⭐⭐⭐⭐⭐ (Excellent)</option>
                                <option value="4">⭐⭐⭐⭐ (Good)</option>
                                <option value="3">⭐⭐⭐ (Average)</option>
                                <option value="2">⭐⭐ (Poor)</option>
                                <option value="1">⭐ (Terrible)</option>
                            </select>
                        </div>
                        <Textarea name="comment" placeholder="Share your experience..." required />
                        <Button type="submit">Post Review</Button>
                    </form>
                </div>
            ) : (
                <div className="p-6 bg-slate-50 rounded-xl text-center">
                    <p>Please <a href="/login" className="text-blue-600 underline">log in</a> to leave a review.</p>
                </div>
            )}
        </div>
    );
}
