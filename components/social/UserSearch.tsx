
"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, UserPlus, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useT } from "@/hooks/useT";

/** Minimal shape returned by /api/users/search. */
type SearchUser = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
};

export function UserSearch() {
    const { t } = useT();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const searchUsers = async (q: string) => {
        if (q.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setLoading(true);
        setIsOpen(true);
        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            setResults(data.users || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            searchUsers(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder={t("userSearch.placeholder")}
                    className="pl-10 h-11 bg-card border-border focus:ring-primary/20 rounded-xl font-medium"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                )}
            </div>

            {isOpen && (
                <Card className="absolute top-full mt-2 w-full z-50 shadow-2xl border-indigo-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-80 overflow-y-auto">
                        {results.length > 0 ? (
                            <div className="p-2 space-y-1">
                                {results.map((user) => (
                                    <Link
                                        key={user.id}
                                        href={`/profile/${user.id}`}
                                        className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors group"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Avatar className="w-10 h-10 border shadow-sm">
                                            <AvatarImage src={user.avatar_url ?? undefined} />
                                            <AvatarFallback>{user.full_name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-grow min-w-0">
                                            <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                                {user.full_name}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-none mt-0.5">
                                                {user.role}
                                            </p>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted-foreground">
                                <p className="text-sm font-medium">{t("userSearch.noResults")}</p>
                                <p className="text-[10px] uppercase tracking-wider mt-1">{t("userSearch.tryDifferent")}</p>
                            </div>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
}
