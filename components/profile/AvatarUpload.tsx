
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";

interface AvatarUploadProps {
    currentAvatarUrl?: string | null;
    onUploadComplete?: (url: string) => void;
}

export function AvatarUpload({ currentAvatarUrl, onUploadComplete }: AvatarUploadProps) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            setError(null);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error("You must select an image to upload.");
            }

            const file = event.target.files[0];
            const fileExt = file.name.split(".").pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

            setAvatarUrl(data.publicUrl);
            if (onUploadComplete) onUploadComplete(data.publicUrl);

        } catch (error: any) {
            setError(error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setAvatarUrl(null);
        if (onUploadComplete) onUploadComplete("");
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-sm group">
                {avatarUrl ? (
                    <>
                        <Image
                            src={avatarUrl}
                            alt="Avatar"
                            fill
                            className="object-cover"
                        />
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-8 h-8 text-white" />
                        </button>
                    </>
                ) : (
                    <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="relative cursor-pointer"
                    disabled={uploading}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            Change Photo
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={uploading}
                            />
                        </>
                    )}
                </Button>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <p className="text-xs text-muted-foreground">
                    Recommended: Square JPG or PNG.
                </p>
            </div>

            {/* Hidden input to store URL for form submission if used inside a form directly, 
                though strict separation usually implies passing value up. 
                We will assume the parent page handles the form state or we use a hidden input here.
            */}
            <input type="hidden" name="avatar_url" value={avatarUrl || ""} />
        </div>
    );
}
