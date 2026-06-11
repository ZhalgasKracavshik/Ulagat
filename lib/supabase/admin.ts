import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client using the service-role key.
 * Only use this in server-side code (Server Components, Server Actions, Route Handlers).
 * Never expose this client to the browser.
 */
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}
