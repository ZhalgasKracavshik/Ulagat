
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { addReview } from "@/app/services/[id]/actions";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";

/** A review row joined with its reviewer profile. */
type ReviewRow = {
    id: string;
    rating: number;
    comment: string | null;
    profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

export async function ReviewSection({ serviceId }: { serviceId: string }) {
    const supabase = await createClient();

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string, vars?: Record<string, string | number>) => {
        let v = resolveKey(dict, key);
        if (vars) for (const [n, r] of Object.entries(vars)) v = v.replace(`{${n}}`, String(r));
        return v;
    };

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
            <h3 className="text-2xl font-bold">{t('serviceDetail.reviewsTitle', { count: reviews?.length || 0 })}</h3>

            {/* List Reviews */}
            <div className="space-y-4">
                {reviews && reviews.length > 0 ? (
                    (reviews as ReviewRow[]).map((review) => (
                        <div key={review.id} className="flex gap-4 p-4 bg-muted rounded-lg border">
                            <Avatar>
                                <AvatarImage src={review.profiles?.avatar_url ?? undefined} />
                                <AvatarFallback>{review.profiles?.full_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold">{review.profiles?.full_name}</span>
                                    <div className="flex text-yellow-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-muted-foreground'}`} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-muted-foreground text-sm">{review.comment}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-muted-foreground italic">{t('serviceDetail.noReviews')}</p>
                )}
            </div>

            {/* Add Review Form */}
            {user ? (
                <div className="bg-card p-6 rounded-xl border shadow-sm">
                    <h4 className="font-bold mb-4">{t('serviceDetail.leaveReview')}</h4>
                    <form action={addReview.bind(null, serviceId)} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('serviceDetail.rating')}</label>
                            <select name="rating" className="w-full border rounded-md p-2 text-sm bg-background">
                                <option value="5">{t('serviceDetail.rating5')}</option>
                                <option value="4">{t('serviceDetail.rating4')}</option>
                                <option value="3">{t('serviceDetail.rating3')}</option>
                                <option value="2">{t('serviceDetail.rating2')}</option>
                                <option value="1">{t('serviceDetail.rating1')}</option>
                            </select>
                        </div>
                        <Textarea name="comment" placeholder={t('serviceDetail.commentPlaceholder')} required />
                        <Button type="submit">{t('serviceDetail.postReview')}</Button>
                    </form>
                </div>
            ) : (
                <div className="p-6 bg-muted rounded-xl text-center">
                    <p>{t('serviceDetail.loginPrefix')}<a href="/login" className="text-blue-600 underline">{t('serviceDetail.loginLink')}</a>{t('serviceDetail.loginSuffix')}</p>
                </div>
            )}
        </div>
    );
}
