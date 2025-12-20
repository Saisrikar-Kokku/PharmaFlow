import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    // Using untyped client to avoid strict type checking issues
    // Database types can be regenerated from Supabase when needed
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

// Singleton instance for client-side usage
let supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
    if (!supabase) {
        supabase = createClient();
    }
    return supabase;
}
