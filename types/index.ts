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
