import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseClient } from "./supabase-browser";

interface AuthContextType {
    userEmail: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = getSupabaseClient();

        // Restore existing session on mount.
        supabase.auth.getSession().then(({ data }) => {
            setUserEmail(data.session?.user.email ?? null);
            setLoading(false);
        });

        // Keep in sync with sign-in/sign-out/token-refresh events.
        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, session: Session | null) => {
                setUserEmail(session?.user.email ?? null);
            },
        );

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        setLoading(true);
        try {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw new Error(error.message);
            setUserEmail(data.user?.email ?? null);
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (email: string, password: string) => {
        setLoading(true);
        try {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) throw new Error(error.message);

            // If email confirmation is required, there's a user but no session yet.
            if (!data.session) {
                throw new Error("Check your inbox to confirm your email before signing in.");
            }
            setUserEmail(data.user?.email ?? null);
        } finally {
            setLoading(false);
        }
    };

    const signOut = () => {
        const supabase = getSupabaseClient();
        supabase.auth.signOut();
        setUserEmail(null);
    };

    return (
        <AuthContext.Provider value={{ userEmail, signIn, signUp, signOut, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}