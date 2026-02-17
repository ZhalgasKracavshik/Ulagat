
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trophy, BookOpen, Crown, LogOut, User, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export async function Navbar() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch profile if user exists
    let profile = null;
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        profile = data;
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-14 items-center px-4 md:px-6">
                <div className="mr-4 flex">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            ULAGAT
                        </span>
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium hidden md:flex">
                        <Link href="/services" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            Services
                        </Link>
                        <Link href="/events" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1">
                            <Trophy className="w-4 h-4" />
                            Events
                        </Link>
                        <Link href="/leaderboard" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1">
                            <Crown className="w-4 h-4" />
                            Leaderboard
                        </Link>
                        {user && (
                            <Link href="/messages" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1">
                                <MessageCircle className="w-4 h-4" />
                                Messages
                            </Link>
                        )}
                    </nav>
                </div>
                <div className="ml-auto flex items-center space-x-4">
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={profile?.avatar_url} />
                                        <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {profile?.role === 'admin' ? 'Administrator' : profile?.role === 'teacher' ? 'Teacher' : 'Student'}
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
                                {profile?.role === 'admin' && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/admin" className="cursor-pointer">
                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                            <span>Admin Panel</span>
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                    <form action="/api/auth/signout" method="POST" className="w-full">
                                        <button className="flex w-full items-center text-red-600">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Log out</span>
                                        </button>
                                    </form>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
        </header>
    );
}

// Helper icon
import { ShieldCheck } from "lucide-react";
