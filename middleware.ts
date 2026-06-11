
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/session";
import { createServerClient } from "@supabase/ssr";

// Routes that require authentication (any logged-in user)
const PROTECTED_ROUTES = [
    '/home',
    '/profile',
    '/messages',
    '/friends',
    '/leaderboard',
    '/olympiad',
    '/events',
    '/services',
    '/admin',
    '/schedule',
    '/announcements',
    '/lost-found',
    '/certificates',
    '/career',
    '/clubs',
];

// Routes that parents CANNOT access (creation / submission routes)
const PARENT_BLOCKED_ROUTES = [
    '/services/new',
    '/events/new',
    '/clubs/new',
    '/olympiad/new',
    '/lost-found/new',
];

// Routes only accessible to admin/moderator
const ADMIN_ONLY_ROUTES = ['/admin'];

// Routes that parliament role gets (beyond student) — creation routes
const PARLIAMENT_ALLOWED_NEW_ROUTES = [
    '/events/new',
    '/clubs/new',
    '/lost-found/new',
];

function getRole(profile: { role: string } | null): string {
    return profile?.role ?? 'student';
}

export async function middleware(request: NextRequest) {
    // First refresh the auth session
    const sessionResponse = await updateSession(request);

    const { pathname } = request.nextUrl;

    // Skip role checks for public/auth routes
    const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
    if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        return sessionResponse;
    }

    // Check if the path requires auth
    const requiresAuth = PROTECTED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(route + '/')
    );

    if (!requiresAuth) {
        return sessionResponse;
    }

    // Create a Supabase client to read the user
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                setAll(_cookiesToSet) {
                    // Read-only in middleware — session was already refreshed above
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Fetch profile role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = getRole(profile);

    // Admin-only routes
    if (ADMIN_ONLY_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
        if (role !== 'admin' && role !== 'moderator') {
            return NextResponse.redirect(new URL('/home', request.url));
        }
        return sessionResponse;
    }

    // Parent role restrictions
    if (role === 'parent') {
        const isBlocked = PARENT_BLOCKED_ROUTES.some(
            (r) => pathname === r || pathname.startsWith(r + '/')
        );
        if (isBlocked) {
            return NextResponse.redirect(new URL('/home', request.url));
        }
        return sessionResponse;
    }

    // Parliament role: same as student but can also access creation routes
    if (role === 'parliament') {
        // Parliament can access all student routes AND parliament-specific ones
        return sessionResponse;
    }

    // Student role: block creation routes that only teachers/admins/parliament can access
    if (role === 'student') {
        const teacherOnlyNewRoutes = ['/services/new', '/olympiad/new'];
        // events/new is accessible to parliament but not plain students in default config
        // For now, students are blocked from /events/new and /services/new and /olympiad/new
        const blockedForStudent = [
            ...teacherOnlyNewRoutes,
            '/events/new',
            '/clubs/new',
        ];
        const isBlocked = blockedForStudent.some(
            (r) => pathname === r || pathname.startsWith(r + '/')
        );
        if (isBlocked) {
            return NextResponse.redirect(new URL('/home', request.url));
        }
        return sessionResponse;
    }

    return sessionResponse;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
