"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0f172a",
                    color: "#f8fafc",
                    fontFamily:
                        "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
                    padding: "1rem",
                }}
            >
                <div style={{ maxWidth: "28rem", textAlign: "center" }}>
                    <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
                        Something went wrong
                    </h1>
                    <p style={{ fontSize: "0.875rem", color: "#94a3b8", margin: "0 0 1.5rem" }}>
                        A critical error occurred. Please try again.
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            borderRadius: "0.5rem",
                            border: "none",
                            backgroundColor: "#7c3aed",
                            color: "#ffffff",
                            padding: "0.5rem 1rem",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            cursor: "pointer",
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
