import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const achievement_date = formData.get("achievement_date") as string;
    const imageFile = formData.get("image") as File | null;

    if (!title) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let image_url: string | null = null;

    // Upload image if provided
    if (imageFile && imageFile.size > 0) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from("achievements")
            .upload(fileName, imageFile, {
                cacheControl: "3600",
                upsert: false,
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            // Continue without image if upload fails
        } else {
            const { data: urlData } = supabase.storage
                .from("achievements")
                .getPublicUrl(fileName);
            image_url = urlData.publicUrl;
        }
    }

    const { error } = await supabase.from("achievements").insert({
        user_id: user.id,
        title,
        description: description || null,
        achievement_date: achievement_date || null,
        image_url,
    });

    if (error) {
        console.error("DB error:", error);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();

    const { error } = await supabase
        .from("achievements")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

    if (error) {
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
