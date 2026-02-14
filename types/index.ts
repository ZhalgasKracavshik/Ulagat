export type Profile = {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: 'student' | 'teacher' | 'admin';
    created_at: string;
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
    metadata: Record<string, any>;
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
