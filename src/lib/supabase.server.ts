import { createClient } from "@supabase/supabase-js";

export type Database = {
    public: {
        Tables: {
            chats: {
                Row: {
                    id: string;
                    user_email: string;
                    name: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_email: string;
                    name: string;
                    created_at?: string;
                };
                Update: Partial<{
                    id: string;
                    user_email: string;
                    name: string;
                    created_at: string;
                }>;
                Relationships: [];
            };
            messages: {
                Row: {
                    id: string;
                    chat_id: string;
                    role: "user" | "model";
                    content: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    chat_id: string;
                    role: "user" | "model";
                    content: string;
                    created_at?: string;
                };
                Update: Partial<{
                    id: string;
                    chat_id: string;
                    role: "user" | "model";
                    content: string;
                    created_at: string;
                }>;
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
};

export function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (!url || !key) {
        throw new Error("SUPABASE_URL / SUPABASE_KEY env vars are not set");
    }
    return createClient<Database>(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    });
}

export type ChatRow = Database["public"]["Tables"]["chats"]["Row"];
export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];