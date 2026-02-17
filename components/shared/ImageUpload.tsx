
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, ImagePlus } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
    value?: string;
    onChange?: (url: string) => void;
    bucketName?: string;
}

export function ImageUpload({ value, onChange, bucketName = "service-images" }: ImageUploadProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(value || null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            setError(null);

            if (!event.target.files || event.target.files.length === 0) {
                return;
            }

            const file = event.target.files[0];
            const fileExt = file.name.split(".").pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);

            setImageUrl(data.publicUrl);
            if (onChange) onChange(data.publicUrl);

        } catch (error: any) {
            setError(error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setImageUrl(null);
        if (onChange) onChange("");
    };

    return (
        <div className="w-full">
            {imageUrl ? (
                <div className="relative w-full h-64 rounded-xl overflow-hidden border bg-slate-100 group">
                    <Image
                        src={imageUrl}
                        alt="Uploaded content"
                        fill
                        className="object-cover"
                    />
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 rounded-full text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <div className="relative w-full h-40 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center text-slate-400 group cursor-pointer">
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                    {uploading ? (
                        <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
                    ) : (
                        <ImagePlus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                    )}
                    <p className="text-sm font-medium">
                        {uploading ? "Uploading..." : "Click to upload cover image"}
                    </p>
                </div>
            )}
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

            {/* Hidden Input for Form Submission */}
            <input type="hidden" name="image_url" value={imageUrl || ""} />
        </div>
    );
}
