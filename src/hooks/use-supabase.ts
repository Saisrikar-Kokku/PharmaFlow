"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile, Alert } from "@/types/database";

const supabase = createClient();

export function useSupabase() {
    return supabase;
}

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        setProfile(data);
        setLoading(false);
    };

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        // Clear intro flag so it shows again on next login
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem("hasShownDashboardIntro");
        }
        // Redirect to login page
        window.location.href = '/login';
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user?.id) {
            await fetchProfile(user.id);
        }
    }, [user]);

    return {
        user,
        profile,
        loading,
        signOut,
        refreshProfile,
        isAdmin: profile?.role === "admin",
        isPharmacist: profile?.role === "pharmacist",
        isStaff: profile?.role === "staff",
    };
}

// Hook for real-time subscriptions
export function useRealtimeSubscription<T>(
    table: string,
    callback: (payload: T) => void,
    filter?: { column: string; value: string }
) {
    useEffect(() => {
        let channel = supabase.channel(`${table}_changes`);

        if (filter) {
            channel = channel.on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table,
                    filter: `${filter.column}=eq.${filter.value}`,
                },
                (payload) => callback(payload.new as T)
            );
        } else {
            channel = channel.on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table,
                },
                (payload) => callback(payload.new as T)
            );
        }

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [table, callback, filter]);
}

// Hook for alerts with real-time updates
export function useAlerts() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchAlerts();

        // Real-time updates for alerts
        const channel = supabase
            .channel("alerts_channel")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "alerts",
                },
                () => {
                    fetchAlerts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchAlerts = async () => {
        // First get profile preferences
        const { data: { user } } = await supabase.auth.getUser();
        let preferences: any = {};

        if (user) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("preferences")
                .eq("id", user.id)
                .single();
            // Cast to any to access preferences safely since we only selected partial data
            preferences = (profile as any)?.preferences || {};
        }

        const notifications = preferences?.notifications || {};
        // Default to true if preference is missing, only 'updates' defaults to false usually but let's be permissive
        // Actually match the Settings defaults: low_stock=true, expiry=true, updates=false
        const showLowStock = notifications.low_stock ?? true;
        const showExpiry = notifications.expiry ?? true;
        const showUpdates = notifications.updates ?? false;

        const { data } = await supabase
            .from("alerts")
            .select("*, medicine:medicines(name), batch:batches(batch_number)")
            .order("created_at", { ascending: false })
            .limit(50);

        if (data) {
            const filteredAlerts = data.filter((alert: any) => {
                if (alert.type === 'low_stock' && !showLowStock) return false;
                if ((alert.type === 'expiry_warning' || alert.type === 'expiry_critical') && !showExpiry) return false;
                // Assuming 'updates' covers generalized info or order updates if we had that type
                // For now we just implement the logic we agreed on
                return true;
            });

            setAlerts(filteredAlerts as unknown as Alert[]);
            setUnreadCount(filteredAlerts.filter((a: any) => !a.is_read).length || 0);
        } else {
            setAlerts([]);
            setUnreadCount(0);
        }
        setLoading(false);
    };

    const markAsRead = async (alertId: string) => {
        await supabase
            .from("alerts")
            .update({ is_read: true } as any)
            .eq("id", alertId);

        fetchAlerts();
    };

    const markAllAsRead = async () => {
        await supabase
            .from("alerts")
            .update({ is_read: true } as any)
            .eq("is_read", false);

        fetchAlerts();
    };

    return {
        alerts,
        loading,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refetch: fetchAlerts,
    };
}
