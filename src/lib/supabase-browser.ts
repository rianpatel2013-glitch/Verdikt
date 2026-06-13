import { createClient } from "@supabase/supabase-js";

// Client-side Supabase client using the public anon key — safe to ship to
// the browser. Used for Supabase Auth (sign in/up/out, session management).
// Never put the service-role key here; that belongs in supabase.server.ts.

let client: ReturnType<typeof createClient> | undefined;

export function getSupabaseClient() {
    if (!client) {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!url || !anonKey) {
            throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars are not set");
        }
        client = createClient(url, anonKey);
    }
    return client;
}