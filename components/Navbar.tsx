
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Trophy,
    BookOpen,
    CalendarDays,
    Crown,
    LogOut,
    User,
    MessageCircle,
    GraduationCap,
    Users,
    Users2,
    Menu,
    X,
    ShieldCheck,
    Star,
    Megaphone,
    PackageSearch
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as AuthUser } from "@supabase/supabase-js";
import type { Profile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [profile, setProfile] = useState<(Profile & { reputation?: number }) | null>(null);
    const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
    const [pendingModerationCount, setPendingModerationCount] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const [{ data: profileData }, { count: friendshipCount }] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', user.id).single(),
                    supabase.from('friendships').select('*', { count: 'exact', head: true }).eq('addressee_id', user.id).eq('status', 'pending')
                ]);
                setProfile(profileData);
                setPendingFriendRequests(friendshipCount || 0);

                if (profileData?.role === 'admin' || profileData?.role === 'moderator') {
                    const [{ count: sCount }, { count: eCount }, { count: mCount }] = await Promise.all([
                        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                        supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                        supabase.from('study_materials').select('*', { count: 'exact', head: true }).eq('status', 'pending')
                    ]);
                    setPendingModerationCount((sCount || 0) + (eCount || 0) + (mCount || 0));
                }
            }
        };

        fetchUserData();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (!session) {
                setProfile(null);
                setPendingFriendRequests(0);
                setPendingModerationCount(0);
            } else {
                fetchUserData();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const NavItems = (isMobile = false) => (
        <>
            {user && (
                <Link
                    href="/announcements"
                    onClick={() => isMobile && setIsMobileMenuOpen(false)}
                    className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2 md:gap-1"
                >
                    <Megaphone className="w-5 h-5 md:w-4 md:h-4 text-indigo-500 md:text-inherit" />
                    <span>Announcements</span>
                </Link>
            )}
            {user && (
                <Link
                    href="/schedule"
                    onClick={() => isMobile && setIsMobileMenuOpen(false)}
                    className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2 md:gap-1"
                >
                    <CalendarDays className="w-5 h-5 md:w-4 md:h-4 text-sky-500 md:text-inherit" />
                    <span>Schedule</span>
                </Link>
            )}
            <Link
                href="/services"
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
                className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2 md:gap-1"
            >
                <BookOpen className="w-5 h-5 md:w-4 md:h-4 text-indigo-500 md:text-inherit" />
                <span>Services</span>
            </Link>
            <Link
                href="/events"
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
                className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2 md:gap-1"
            >
                <Trophy className="w-5 h-5 md:w-4 md:h-4 text-amber-500 md:text-inherit" />
                <span>Events</span>
            </Link>
            {user && (
                <Link
                    href="/clubs"
                    onClick={() => isMobile && setIsMobileMenuOpen(false)}
                    className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2 md:gap-1"
                >
                    <Users2 className="w-5 h-5 md:w-4 md:h-4 text-violet-500 md:text-inherit" />
                    <span>Clubs</span>
                </Link>
            )}
            {user && (
                <Link
                    href="/lost-found"
                    onClick={() => isMobile && setIsMobileMenuOpen(false)}
                    className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2 md:gap-1"
                >
                    <PackageSearch className="w-5 h-5 md:w-4 md:h-4 text-teal-500 md:text-inherit" />
                    <span>Lost &amp; Found</span>
                </Link>
            )}
            <Link
                href="/leaderboard"
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
                className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2 md:gap-1"
            >
                <Crown className="w-5 h-5 md:w-4 md:h-4 text-yellow-500 md:text-inherit" />
                <span>Leaderboard</span>
            </Link>
            {user && (
                <Link
                    href="/friends"
                    onClick={() => isMobile && setIsMobileMenuOpen(false)}
                    className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2 md:gap-1 relative"
                >
                    <Users className="w-5 h-5 md:w-4 md:h-4 text-blue-500 md:text-inherit" />
                    <span>Friends</span>
                    {pendingFriendRequests > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                </Link>
            )}
            <Link
                href="/olympiad"
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
                className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2 md:gap-1"
            >
                <GraduationCap className="w-5 h-5 md:w-4 md:h-4 text-emerald-500 md:text-inherit" />
                <span>Prep</span>
            </Link>
            {user && (
                <Link
                    href="/messages"
                    onClick={() => isMobile && setIsMobileMenuOpen(false)}
                    className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2 md:gap-1"
                >
                    <MessageCircle className="w-5 h-5 md:w-4 md:h-4 text-pink-500 md:text-inherit" />
                    <span>Chats</span>
                </Link>
            )}
            {(profile?.role === 'admin' || profile?.role === 'moderator') && (
                <Link
                    href="/admin/moderation"
                    onClick={() => isMobile && setIsMobileMenuOpen(false)}
                    className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2 md:gap-1 relative font-bold text-indigo-700 md:text-inherit"
                >
                    <ShieldCheck className="w-5 h-5 md:w-4 md:h-4" />
                    <span>Moderation</span>
                    {pendingModerationCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                            {pendingModerationCount}
                        </span>
                    )}
                </Link>
            )}
        </>
    );

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-14 items-center px-4 md:px-6">
                <div className="flex items-center gap-4">
                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>

                    <Link href={user ? "/home" : "/"} className="flex items-center space-x-2">
                        <span className="font-black text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            ULAGAT
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                        {NavItems()}
                    </nav>
                </div>

                <div className="ml-auto flex items-center space-x-4">
                    {user ? (
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span className="text-sm font-bold text-amber-700">{profile?.reputation || 0}</span>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={profile?.avatar_url ?? undefined} />
                                            <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                                            <p className="text-xs leading-none text-muted-foreground capitalize">
                                                {profile?.role}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile/me" className="cursor-pointer">
                                            <User className="mr-2 h-4 w-4" />
                                            <span>My Profile</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={async () => {
                                        await supabase.auth.signOut();
                                        window.location.href = "/";
                                    }}>
                                        <div className="flex w-full items-center text-red-600 cursor-pointer">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Log out</span>
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/login">
                                <Button variant="ghost" size="sm">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button size="sm">
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-14 left-0 w-full bg-background border-b shadow-lg animate-in slide-in-from-top-2 duration-200">
                    <nav className="flex flex-col p-6 gap-6 text-lg font-medium">
                        {NavItems(true)}
                    </nav>
                </div>
            )}
        </header>
    );
}
