"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MAX_PDF_BYTES } from "@/lib/olympiad";

/**
 * PDF file input with client-side validation (max 10 MB, .pdf only).
 * The server action re-validates — this is just instant feedback.
 */
export function PdfFileInput() {
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) {
            setError(null);
            return;
        }

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
            setError("Only .pdf files are allowed.");
            if (inputRef.current) inputRef.current.value = '';
            return;
        }
        if (file.size > MAX_PDF_BYTES) {
            setError("The PDF must be 10 MB or smaller.");
            if (inputRef.current) inputRef.current.value = '';
            return;
        }
        setError(null);
    }

    return (
        <div className="space-y-1">
            <Input
                ref={inputRef}
                id="pdf"
                name="pdf"
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleChange}
                className="h-11 border-border rounded-lg shadow-sm cursor-pointer file:font-semibold file:text-indigo-600"
            />
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        </div>
    );
}
