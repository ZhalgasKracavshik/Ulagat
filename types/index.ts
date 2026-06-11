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

/** Subset of Profile used in the admin users management table */
export type AdminUserRow = {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: UserRole;
    grade: number | null;
    class_letter: string | null;
    created_at: string;
    external_skud_id: string | null;
};
