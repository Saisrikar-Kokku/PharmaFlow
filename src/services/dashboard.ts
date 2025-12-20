import { createClient } from "@/lib/supabase/client";
import type {
    Medicine,
    Batch,
    Category,
    Supplier,
    Alert,
    Sale,
    ForecastResult
} from "@/types/database";

const supabase = createClient();

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats() {
    const [
        medicinesResult,
        lowStockResult,
        expiringResult,
        todaySalesResult,
        unresolvedAlertsResult,
    ] = await Promise.all([
        // Total medicines count
        supabase.from("medicines").select("id", { count: "exact", head: true }),

        // Low stock medicines (using the view or calculating)
        supabase.from("medicines_with_stock").select("*").eq("is_low_stock", true),

        // Expiring batches in next 30 days
        supabase.from("expiring_batches")
            .select("*")
            .in("expiry_status", ["critical", "warning"]),

        // Today's sales
        supabase.from("sales")
            .select("total")
            .gte("created_at", new Date().toISOString().split("T")[0]),

        // Unresolved alerts count
        supabase.from("alerts")
            .select("id", { count: "exact", head: true })
            .eq("is_resolved", false),
    ]);

    const todayTotal = (todaySalesResult.data as any[])?.reduce((sum: number, s: any) => sum + Number(s.total), 0) || 0;

    return {
        totalMedicines: medicinesResult.count || 0,
        lowStockCount: lowStockResult.data?.length || 0,
        expiringCount: expiringResult.data?.length || 0,
        todaySales: todayTotal,
        unresolvedAlerts: unresolvedAlertsResult.count || 0,
    };
}

// ============================================
// ALERTS
// ============================================

export async function getRecentAlerts(limit: number = 10) {
    const { data, error } = await supabase
        .from("alerts")
        .select(`
      *,
      medicine:medicines(name),
      batch:batches(batch_number)
    `)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching alerts:", error);
        return [];
    }

    return data || [];
}

export async function getUnreadAlertsCount() {
    const { count } = await supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);

    return count || 0;
}

// ============================================
// EXPIRING BATCHES (FEFO)
// ============================================

export async function getExpiringBatches(limit: number = 10) {
    const { data, error } = await supabase
        .from("expiring_batches")
        .select("*")
        .in("expiry_status", ["critical", "warning", "expired"])
        .order("days_until_expiry", { ascending: true })
        .limit(limit);

    if (error) {
        console.error("Error fetching expiring batches:", error);
        return [];
    }

    return data || [];
}

// ============================================
// SALES
// ============================================

export async function getRecentSales(limit: number = 10) {
    const { data, error } = await supabase
        .from("sales")
        .select(`
      *,
      sale_items(
        quantity,
        medicine:medicines(name)
      )
    `)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching sales:", error);
        return [];
    }

    return data || [];
}

export async function getTodaySalesTotal() {
    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
        .from("sales")
        .select("total")
        .gte("created_at", today);

    return (data as any[])?.reduce((sum: number, s: any) => sum + Number(s.total), 0) || 0;
}

// ============================================
// MEDICINES
// ============================================

export async function getMedicinesWithStock() {
    const { data, error } = await supabase
        .from("medicines_with_stock")
        .select("*")
        .order("name");

    if (error) {
        console.error("Error fetching medicines:", error);
        return [];
    }

    return data || [];
}

export async function getMedicineById(id: string) {
    const { data, error } = await supabase
        .from("medicines")
        .select(`
      *,
      category:categories(name, color),
      supplier:suppliers(name),
      batches(*)
    `)
        .eq("id", id)
        .single();

    if (error) {
        console.error("Error fetching medicine:", error);
        return null;
    }

    return data;
}

export async function getAllMedicines() {
    const { data, error } = await supabase
        .from("medicines")
        .select(`
      *,
      category:categories(name, color)
    `)
        .order("name");

    if (error) {
        console.error("Error fetching medicines:", error);
        return [];
    }

    return data || [];
}

// ============================================
// BATCHES
// ============================================

export async function getBatchesForMedicine(medicineId: string) {
    const { data, error } = await supabase
        .from("batches")
        .select("*")
        .eq("medicine_id", medicineId)
        .eq("status", "active")
        .order("expiry_date", { ascending: true });

    if (error) {
        console.error("Error fetching batches:", error);
        return [];
    }

    return data || [];
}

// ============================================
// CATEGORIES
// ============================================

export async function getAllCategories() {
    const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

    if (error) {
        console.error("Error fetching categories:", error);
        return [];
    }

    return data || [];
}

// ============================================
// SUPPLIERS
// ============================================

export async function getAllSuppliers() {
    const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .order("name");

    if (error) {
        console.error("Error fetching suppliers:", error);
        return [];
    }

    return data || [];
}

// ============================================
// STOCK VALUE CALCULATION
// ============================================

export async function getTotalStockValue() {
    const { data, error } = await supabase
        .from("batches")
        .select("quantity, selling_price")
        .eq("status", "active");

    if (error) {
        console.error("Error calculating stock value:", error);
        return 0;
    }

    return (data as any[])?.reduce((sum: number, b: any) => sum + (b.quantity * Number(b.selling_price)), 0) || 0;
}

// ============================================
// QUICK STATS FOR DASHBOARD
// ============================================

export async function getQuickStats() {
    const [stockValue, todaySales, transactionCount] = await Promise.all([
        getTotalStockValue(),
        getTodaySalesTotal(),
        supabase
            .from("sales")
            .select("id", { count: "exact", head: true })
            .gte("created_at", new Date().toISOString().split("T")[0]),
    ]);

    return {
        stockValue,
        todaySales,
        transactionCount: transactionCount.count || 0,
    };
}
