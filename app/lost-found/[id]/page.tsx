import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    MapPin,
    Clock,
    ArrowLeft,
    ShieldCheck,
    CheckCircle2,
    User as UserIcon,
    Package,
} from "lucide-react";
import { LOST_ITEM_STAFF_ROLES } from "@/lib/lost-found";
import { lostItemCategoryKey } from "@/lib/lost-found-i18n";
import { LOST_ITEM_CATEGORY_ICONS } from "@/components/lost-found/category-icons";
import { StatusBadge } from "@/components/lost-found/StatusBadge";
import { ClaimButton } from "@/components/lost-found/ClaimButton";
import { StatusManager, type Claimant } from "@/components/lost-found/StatusManager";
import { DeleteItemButton } from "@/components/lost-found/DeleteItemButton";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";
import type { LostItem } from "@/types";

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ClaimRow = {
    id: string;
    claimant_id: string;
    note: string | null;
    created_at: string;
    profiles: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
};

export default async function LostItemPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!UUID_RE.test(id)) notFound();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/login?next=/lost-found/${id}`);

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string, vars?: Record<string, string | number>) => {
        let value = resolveKey(dict, key);
        if (vars) {
            for (const [name, replacement] of Object.entries(vars)) {
                value = value.replace(`{${name}}`, String(replacement));
            }
        }
        return value;
    };

    const [{ data: itemRaw }, { data: profile }] = await Promise.all([
        supabase.from('lost_items').select('*').eq('id', id).single(),
        supabase.from('profiles').select('role').eq('id', user.id).single(),
    ]);

    if (!itemRaw) notFound();
    const item = itemRaw as LostItem;
    const role = profile?.role ?? 'student';
    const isStaff = (LOST_ITEM_STAFF_ROLES as readonly string[]).includes(role);
    const isPoster = item.posted_by === user.id;

    // Poster name + (staff only) the full immutable claim audit log.
    const [{ data: posterProfile }, { data: claimsRaw }, { data: myClaim }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').eq('id', item.posted_by).single(),
        isStaff
            ? supabase
                .from('lost_item_claims')
                .select('id, claimant_id, note, created_at, profiles:claimant_id(id, full_name, avatar_url)')
                .eq('item_id', id)
                .order('created_at', { ascending: true })
            : Promise.resolve({ data: null }),
        supabase
            .from('lost_item_claims')
            .select('id')
            .eq('item_id', id)
            .eq('claimant_id', user.id)
            .maybeSingle(),
    ]);

    const claims = (claimsRaw ?? []) as unknown as ClaimRow[];
    const hasClaimed = !!myClaim;
    const canClaim = !isPoster && item.status !== 'claimed' && !hasClaimed;

    const claimants: Claimant[] = claims.map((c) => ({
        id: c.claimant_id,
        name: c.profiles?.full_name || t('lostFoundDetail.unknown'),
    }));

    const CategoryIcon = LOST_ITEM_CATEGORY_ICONS[item.category] ?? Package;

    return (
        <div className="container mx-auto py-8 space-y-6 px-4 md:px-6 max-w-4xl">
            <Link href="/lost-found" className="inline-flex">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                    <ArrowLeft className="w-4 h-4" />
                    {t('lostFoundDetail.allItems')}
                </Button>
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Photo */}
                <div className="aspect-square w-full rounded-2xl overflow-hidden border border-border bg-muted flex items-center justify-center">
                    {item.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.photo_url} alt={item.title} className="object-cover w-full h-full" />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full bg-teal-50 dark:bg-teal-950/40 text-teal-200 dark:text-teal-700">
                            <CategoryIcon className="w-24 h-24" />
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={item.status} />
                        <Badge variant="outline" className="border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold">
                            {t(lostItemCategoryKey(item.category))}
                        </Badge>
                    </div>

                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{item.title}</h1>

                    {item.description && (
                        <p className="text-muted-foreground whitespace-pre-line">{item.description}</p>
                    )}

                    <div className="space-y-2 text-sm pt-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4 text-teal-500 shrink-0" />
                            <span>{item.location || t('lostFoundDetail.noLocation')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4 text-teal-500 shrink-0" />
                            <span>{t('lostFoundDetail.posted', { date: format(new Date(item.created_at), 'MMM d, yyyy') })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <UserIcon className="w-4 h-4 text-teal-500 shrink-0" />
                            <span>
                                {t('lostFoundDetail.postedBy')}{' '}
                                <Link href={`/profile/${item.posted_by}`} className="text-teal-700 hover:underline font-semibold">
                                    {posterProfile?.full_name || t('lostFoundDetail.unknown')}
                                </Link>
                            </span>
                        </div>
                    </div>

                    {/* Claim area */}
                    <div className="pt-2">
                        {item.status === 'claimed' ? (
                            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-emerald-800 dark:text-emerald-300 font-semibold">
                                <CheckCircle2 className="w-5 h-5" />
                                {t('lostFoundDetail.returnedToOwner')}
                            </div>
                        ) : hasClaimed ? (
                            <div className="flex items-center gap-2 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 p-4 text-teal-800 dark:text-teal-300 font-semibold">
                                <CheckCircle2 className="w-5 h-5" />
                                {t('lostFoundDetail.awaitingVerification')}
                            </div>
                        ) : canClaim ? (
                            <ClaimButton itemId={item.id} />
                        ) : isPoster ? (
                            <p className="text-sm text-muted-foreground italic">{t('lostFoundDetail.youPosted')}</p>
                        ) : null}
                    </div>

                    {(isPoster || isStaff) && (
                        <div className="pt-2">
                            <DeleteItemButton itemId={item.id} />
                        </div>
                    )}
                </div>
            </div>

            {/* Staff: status management + immutable claim audit log */}
            {isStaff && (
                <Card className="border-indigo-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ShieldCheck className="w-5 h-5 text-indigo-500" />
                            {t('lostFoundDetail.verificationStatus')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <StatusManager itemId={item.id} status={item.status} claimants={claimants} />

                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                {t('lostFoundDetail.claimAuditLog', { count: claims.length })}
                            </h3>
                            {claims.length > 0 ? (
                                <div className="space-y-3">
                                    {claims.map((claim) => (
                                        <div
                                            key={claim.id}
                                            className={`flex items-start gap-3 p-3 rounded-lg border ${claim.claimant_id === item.claimed_by ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30' : 'border-border bg-muted'}`}
                                        >
                                            <Avatar className="w-9 h-9 border shrink-0">
                                                <AvatarImage src={claim.profiles?.avatar_url ?? undefined} />
                                                <AvatarFallback className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 text-sm">
                                                    {claim.profiles?.full_name?.[0] || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-grow min-w-0 space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Link href={`/profile/${claim.claimant_id}`} className="font-semibold text-foreground hover:text-indigo-700 hover:underline">
                                                        {claim.profiles?.full_name || t('lostFoundDetail.unknown')}
                                                    </Link>
                                                    {claim.claimant_id === item.claimed_by && (
                                                        <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-[10px] font-bold gap-1">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            {t('lostFoundDetail.received')}
                                                        </Badge>
                                                    )}
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {format(new Date(claim.created_at), 'MMM d, yyyy · HH:mm')}
                                                    </span>
                                                </div>
                                                {claim.note && (
                                                    <p className="text-sm text-muted-foreground whitespace-pre-line">{claim.note}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground py-2">{t('lostFoundDetail.noClaims')}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
