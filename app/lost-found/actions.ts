"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
    LOST_ITEM_POSTER_ROLES,
    LOST_ITEM_STAFF_ROLES,
    isLostItemCategory,
} from "@/lib/lost-found";
import { notifyItemFound } from "@/lib/notifications/lost-found";
import type { LostItemStatus } from "@/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** Authenticated user + profile role, or throws. */
async function requireUser(): Promise<{ supabase: ServerSupabase; userId: string; role: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized: you must be signed in.");

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (error || !profile) throw new Error("Failed to verify user role.");
    return { supabase, userId: user.id, role: profile.role as string };
}

function revalidateLostFoundPaths(itemId?: string) {
    revalidatePath('/lost-found');
    if (itemId) {
        revalidatePath(`/lost-found/${itemId}`);
    }
}

/**
 * Posts a lost or found item. student/teacher/parliament (and staff for
 * completeness) only. posted_by is always the caller; the status may only
 * be 'lost' or 'found' (a brand-new post is never 'claimed').
 */
export async function createLostItem(formData: FormData) {
    const { supabase, userId, role } = await requireUser();

    if (!(LOST_ITEM_POSTER_ROLES as readonly string[]).includes(role)) {
        throw new Error("Unauthorized: you are not allowed to post lost & found items.");
    }

    const title = ((formData.get('title') as string) || '').trim();
    const description = ((formData.get('description') as string) || '').trim();
    const category = ((formData.get('category') as string) || '').trim();
    const location = ((formData.get('location') as string) || '').trim();
    const photoUrl = ((formData.get('image_url') as string) || '').trim();
    const statusRaw = ((formData.get('status') as string) || '').trim();

    if (!title) throw new Error("Title is required.");
    if (title.length > 120) throw new Error("Title is too long (max 120 characters).");
    if (!isLostItemCategory(category)) throw new Error("Invalid category.");
    if (location.length > 160) throw new Error("Location is too long (max 160 characters).");
    if (description.length > 2000) throw new Error("Description is too long (max 2000 characters).");

    // A new post is either something the user lost or something they found.
    const status: LostItemStatus = statusRaw === 'lost' ? 'lost' : 'found';

    // The photo must live in our public lost-found bucket — no arbitrary
    // external URLs (tracking pixels, deceptive content, …).
    if (photoUrl) {
        const allowedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lost-found/`;
        if (!photoUrl.startsWith(allowedPrefix)) {
            throw new Error("Invalid photo URL: photos must be uploaded to the lost & found storage.");
        }
    }

    const { data: item, error } = await supabase
        .from('lost_items')
        .insert({
            title,
            description: description || null,
            category,
            location: location || null,
            photo_url: photoUrl || null,
            status,
            posted_by: userId,
        })
        .select('id')
        .single();

    if (error || !item) {
        console.error("[createLostItem] insert failed:", error);
        throw new Error("Failed to post the item.");
    }

    revalidateLostFoundPaths(item.id);
    redirect(`/lost-found/${item.id}`);
}

/**
 * Registers a "This is mine!" claim. Any authenticated user except the
 * poster, on an item that is not yet claimed. The claim is an immutable
 * audit-log row (anti-fraud) — duplicates are reported, never silently
 * swallowed.
 */
export async function claimItem(formData: FormData) {
    const itemId = ((formData.get('item_id') as string) || '').trim();
    if (!UUID_RE.test(itemId)) throw new Error("Invalid item id.");
    const note = ((formData.get('note') as string) || '').trim();
    if (note.length > 500) throw new Error("Note is too long (max 500 characters).");

    const { supabase, userId } = await requireUser();

    const { data: item, error: itemError } = await supabase
        .from('lost_items')
        .select('id, posted_by, status')
        .eq('id', itemId)
        .single();

    if (itemError || !item) throw new Error("Item not found.");
    if (item.posted_by === userId) {
        throw new Error("You posted this item — you can't claim it.");
    }
    if (item.status === 'claimed') {
        throw new Error("This item has already been returned to its owner.");
    }

    const { error } = await supabase
        .from('lost_item_claims')
        .insert({ item_id: itemId, claimant_id: userId, note: note || null });

    if (error) {
        // 23505 = unique_violation on (item_id, claimant_id).
        if (error.code === '23505') {
            throw new Error("You already claimed this item.");
        }
        console.error("[claimItem] insert failed:", error);
        throw new Error("Failed to register your claim.");
    }

    revalidateLostFoundPaths(itemId);
}

/**
 * Moves an item through the status machine. parliament/moderator/admin
 * only. When marking 'claimed', a claimant_id that exists in this item's
 * claim log is required — claimed_by is set and claimed_at is stamped by
 * the DB guard trigger. Notifies claimants when an item is marked 'found'.
 */
export async function updateItemStatus(formData: FormData) {
    const itemId = ((formData.get('item_id') as string) || '').trim();
    if (!UUID_RE.test(itemId)) throw new Error("Invalid item id.");

    const { supabase, role } = await requireUser();
    if (!(LOST_ITEM_STAFF_ROLES as readonly string[]).includes(role)) {
        throw new Error("Unauthorized: only parliament, moderators and admins can verify items.");
    }

    const nextStatus = ((formData.get('status') as string) || '').trim();
    if (nextStatus !== 'lost' && nextStatus !== 'found' && nextStatus !== 'claimed') {
        throw new Error("Invalid status.");
    }

    const { data: item, error: itemError } = await supabase
        .from('lost_items')
        .select('id, status')
        .eq('id', itemId)
        .single();
    if (itemError || !item) throw new Error("Item not found.");

    const update: { status: LostItemStatus; claimed_by?: string | null } = {
        status: nextStatus,
    };

    if (nextStatus === 'claimed') {
        const claimantId = ((formData.get('claimant_id') as string) || '').trim();
        if (!UUID_RE.test(claimantId)) {
            throw new Error("Select which claimant received the item.");
        }
        // The recipient must have registered a claim on THIS item.
        const { data: claim, error: claimError } = await supabase
            .from('lost_item_claims')
            .select('id')
            .eq('item_id', itemId)
            .eq('claimant_id', claimantId)
            .maybeSingle();
        if (claimError) {
            console.error("[updateItemStatus] claim lookup failed:", claimError);
            throw new Error("Failed to validate the claimant.");
        }
        if (!claim) {
            throw new Error("That user has not claimed this item.");
        }
        update.claimed_by = claimantId;
    } else {
        // Moving back to lost/found clears any prior recipient.
        update.claimed_by = null;
    }

    const { error } = await supabase
        .from('lost_items')
        .update(update)
        .eq('id', itemId);

    if (error) {
        console.error("[updateItemStatus] update failed:", error);
        throw new Error("Failed to update the item status.");
    }

    // Notify claimants when the item becomes 'found' (located). Non-fatal —
    // the status change is already saved even if email delivery fails.
    if (nextStatus === 'found' && item.status !== 'found') {
        try {
            await notifyItemFound(itemId);
        } catch (notifyError) {
            console.error("[updateItemStatus] notification failed:", notifyError);
        }
    }

    revalidateLostFoundPaths(itemId);
}

/** Deletes a lost & found post (the poster or staff). */
export async function deleteLostItem(formData: FormData) {
    const itemId = ((formData.get('item_id') as string) || '').trim();
    if (!UUID_RE.test(itemId)) throw new Error("Invalid item id.");

    const { supabase, userId, role } = await requireUser();
    const isStaff = (LOST_ITEM_STAFF_ROLES as readonly string[]).includes(role);

    const { data: item, error: itemError } = await supabase
        .from('lost_items')
        .select('id, posted_by')
        .eq('id', itemId)
        .single();
    if (itemError || !item) throw new Error("Item not found.");

    if (item.posted_by !== userId && !isStaff) {
        throw new Error("Unauthorized: only the poster or staff can delete this item.");
    }

    const { error } = await supabase
        .from('lost_items')
        .delete()
        .eq('id', itemId);

    if (error) {
        console.error("[deleteLostItem] delete failed:", error);
        throw new Error("Failed to delete the item.");
    }

    revalidatePath('/lost-found');
    redirect('/lost-found');
}
