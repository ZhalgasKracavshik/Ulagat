
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
    '/achievements',
    '/lost-found',
    '/certificates',
    '/career',
    '/clubs',
    '/pricing',
    '/guide',
    '/settings',
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

// Schedule management routes — moderator (завуч) and admin only.
// /schedule itself stays available to every authenticated user.
const STAFF_ONLY_ROUTES = ['/schedule/manage', '/schedule/substitutions'];

// Announcement creation — moderator and admin only.
// /announcements itself stays available to every authenticated user.
const ANNOUNCEMENT_STAFF_ROUTES = ['/announcements/new'];

// Achievement verification (Phase 6) — parliament, moderator and admin.
// Lives outside /admin so parliament can access it without widening /admin.
const ACHIEVEMENT_REVIEW_ROUTES = ['/achievements/review'];
const ACHIEVEMENT_REVIEWER_ROLES = ['parliament', 'moderator', 'admin'];

// Club creation (Phase 7) — parliament, moderator and admin only (teachers
// don't create clubs). /clubs and /clubs/[id] stay available to every
// authenticated user; /clubs/[id]/manage is guarded server-side in the page
// (dynamic route — keep middleware simple).
const CLUB_CREATE_ROUTES = ['/clubs/new'];
const CLUB_CREATOR_ROLES = ['parliament', 'moderator', 'admin'];

// Career orientation tracker (Phase 12) — student, parent, moderator and
// admin only. Teachers and parliament don't have a personal ЕНТ tracker.
// Parent/staff viewing another student's tracker is controlled in-page via
// family_bonds / role checks.
const CAREER_ROUTES = ['/career'];
const CAREER_ALLOWED_ROLES = ['student', 'parent', 'moderator', 'admin'];

// Parliament (Phases 3-5): allowed to access every creation route —
// /events/new, /services/new, /olympiad/new, /clubs/new, /lost-found/new.
// Server actions + RLS policies enforce the same role rules defensively.

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

    // Staff-only schedule routes (manage timetable / enter substitutions)
    if (STAFF_ONLY_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
        if (role !== 'admin' && role !== 'moderator') {
            return NextResponse.redirect(new URL('/schedule', request.url));
        }
        return sessionResponse;
    }

    // Staff-only announcement routes (publish official announcements)
    if (ANNOUNCEMENT_STAFF_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
        if (role !== 'admin' && role !== 'moderator') {
            return NextResponse.redirect(new URL('/announcements', request.url));
        }
        return sessionResponse;
    }

    // Achievement review (parliament / moderator / admin)
    if (ACHIEVEMENT_REVIEW_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
        if (!ACHIEVEMENT_REVIEWER_ROLES.includes(role)) {
            return NextResponse.redirect(new URL('/home', request.url));
        }
        return sessionResponse;
    }

    // Club creation (parliament / moderator / admin)
    if (CLUB_CREATE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
        if (!CLUB_CREATOR_ROLES.includes(role)) {
            return NextResponse.redirect(new URL('/clubs', request.url));
        }
        return sessionResponse;
    }

    // Career tracker (student / parent / moderator / admin — not teacher/parliament)
    if (CAREER_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
        if (!CAREER_ALLOWED_ROLES.includes(role)) {
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

    // Parliament role: Phases 3-5 allow parliament to create events, services
    // (bulletin board posts) and olympiad materials, so no creation routes are
    // blocked for parliament anymore. Admin/staff-only routes are already
    // handled above.
    if (role === 'parliament') {
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
