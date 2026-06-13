export type UserRole = 'student' | 'teacher' | 'admin' | 'moderator' | 'parent' | 'parliament';

export type Profile = {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: UserRole;
    bio?: string | null;
    social_links?: SocialLink[];
    grade?: number | null;
    class_letter?: string | null;
    phone?: string | null;
    external_skud_id?: string | null;
    /** Phase 6: show a pseudonym instead of name/avatar on the leaderboard */
    leaderboard_anonymous?: boolean;
    created_at: string;
};

export type SocialLink = {
    network: string;
    url: string;
};

export type Service = {
    id: string;
    owner_id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    image_url: string;
    status: 'pending' | 'active' | 'archived';
    created_at: string;
};

export type Event = {
    id: string;
    organizer_id: string;
    title: string;
    description: string;
    event_date: string;
    location: string;
    image_url: string;
    created_at: string;
};

export type ReputationBlock = {
    id: string;
    user_id: string;
    action_type: string;
    points: number;
    metadata: Record<string, unknown>;
    previous_hash: string;
    current_hash: string;
    created_at: string;
};

export type Review = {
    id: string;
    service_id: string;
    reviewer_id: string;
    rating: number;
    comment: string;
    created_at: string;
};

export type ParentInviteToken = {
    id: string;
    token: string;
    student_id: string;
    expires_at: string;
    used_at: string | null;
    created_at: string;
};

export type FamilyBond = {
    id: string;
    parent_id: string;
    student_id: string;
    created_at: string;
};

export type ScheduleEntry = {
    id: string;
    grade: number;
    class_letter: string;
    day_of_week: number; // 1 = Monday … 6 = Saturday
    period: number; // 1-8
    subject: string;
    teacher_name: string | null;
    teacher_id: string | null;
    room: string;
    valid_from: string; // ISO date
    valid_until: string; // ISO date
    created_by: string | null;
    created_at: string;
};

export type SubstitutionType = 'substitution' | 'cancellation' | 'room_change';

export type Substitution = {
    id: string;
    date: string; // ISO date
    grade: number;
    class_letter: string;
    period: number; // 1-8
    type: SubstitutionType;
    subject: string | null;
    substitute_teacher_name: string | null;
    room: string | null;
    note: string | null;
    notified_at: string | null;
    created_by: string;
    created_at: string;
};

export type AnnouncementCategory = 'medical' | 'assembly' | 'important' | 'general';

export type Announcement = {
    id: string;
    title: string;
    body: string;
    category: AnnouncementCategory;
    /** NULL = all grades */
    target_grades: number[] | null;
    pinned: boolean;
    notified_at: string | null;
    created_by: string;
    created_at: string;
    /** NULL = never expires */
    expires_at: string | null;
};

export type ClubCategory =
    | 'debates'
    | 'it'
    | 'chess'
    | 'sport'
    | 'science'
    | 'art'
    | 'music'
    | 'volunteering'
    | 'other';

export type ClubStatus = 'active' | 'archived';

export type Club = {
    id: string;
    name: string;
    description: string | null;
    category: ClubCategory;
    logo_url: string | null;
    leader_id: string;
    status: ClubStatus;
    points: number;
    created_at: string;
};

export type ClubMember = {
    id: string;
    club_id: string;
    user_id: string;
    joined_at: string;
    total_attendance: number;
};

export type ClubMeeting = {
    id: string;
    club_id: string;
    date: string; // ISO date
    notes: string | null;
    attendees: string[];
    created_by: string;
    created_at: string;
};

export type ClubAnnouncement = {
    id: string;
    club_id: string;
    title: string;
    body: string;
    created_by: string;
    created_at: string;
};

export type LostItemCategory =
    | 'electronics'
    | 'clothing'
    | 'books'
    | 'accessories'
    | 'documents'
    | 'other';

/**
 * 'lost'    = someone lost it and is looking for it;
 * 'found'   = someone found it / it is in the lost & found office;
 * 'claimed' = handed back to the owner.
 */
export type LostItemStatus = 'lost' | 'found' | 'claimed';

export type LostItem = {
    id: string;
    title: string;
    description: string | null;
    category: LostItemCategory;
    photo_url: string | null;
    location: string | null;
    status: LostItemStatus;
    posted_by: string;
    claimed_by: string | null;
    claimed_at: string | null;
    created_at: string;
};

export type LostItemClaim = {
    id: string;
    item_id: string;
    claimant_id: string;
    note: string | null;
    created_at: string;
};

/**
 * Phase 12: Career orientation tracker (ЕНТ / UNT prep).
 *
 * The five ЕНТ subject scores. Three mandatory (math literacy, reading,
 * history of Kazakhstan) plus the two chosen profile subjects. Each value is
 * out of 40, total out of 140. Any key may be absent until the student fills
 * it in.
 */
export type EntScores = {
    math_literacy?: number;
    reading?: number;
    history?: number;
    subject_1?: number;
    subject_2?: number;
};

export type CareerTracker = {
    id: string;
    user_id: string;
    profile_subject_1: string | null;
    profile_subject_2: string | null;
    ent_scores: EntScores;
    target_score: number | null;
    notes: string | null;
    updated_at: string;
};

export type CareerTarget = {
    id: string;
    user_id: string;
    university: string;
    specialty: string;
    cutoff_score: number | null;
    grant_deadline: string | null; // ISO date
    created_at: string;
};

/**
 * Phase 13: Two-phase interface mode.
 *   'express' — morning/compact, mobile, glanceable (schedule + substitutions
 *               + pinned announcements + current lesson).
 *   'full'    — evening/desktop, full feature access.
 */
export type UIPhase = 'express' | 'full';

/**
 * Phase 14: Freemium subscription infrastructure.
 *   'free'    — all current campus features.
 *   'premium' — future AI mentor + extras (1500-2000₸/month). Plumbing only.
 */
export type SubscriptionPlan = 'free' | 'premium';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due';

export type Subscription = {
    id: string;
    user_id: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    /** NULL = no period boundary (e.g. free plan). */
    current_period_end: string | null;
    created_at: string;
    updated_at: string;
};

/**
 * Phase 14: per-day AI question counter for the freemium quota.
 * One row per (user, date). Incremented server-side via the admin client
 * when the AI mentor launches; the table is plumbing for now.
 */
export type AiUsage = {
    id: string;
    user_id: string;
    date: string; // ISO date
    question_count: number;
};

/** Subset of Profile used in the admin users management table */
export type AdminUserRow = {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: UserRole;
    grade: number | null;
    class_letter: string | null;
    created_at: string;
    external_skud_id: string | null;
};
