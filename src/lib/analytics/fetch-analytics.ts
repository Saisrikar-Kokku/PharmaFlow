import { createClient } from "@/lib/supabase/client";

interface AnalyticsData {
    revenue: RevenueData;
    sales: SalesData;
    inventory: InventoryData;
    expiry: ExpiryData;
    topSellers: TopSeller[];
    categoryBreakdown: CategoryBreakdown[];
}

interface CategoryBreakdown {
    name: string;
    value: number;
    revenue: number;
    color: string;
}

interface RevenueData {
    today: number;
    yesterday: number;
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
    dailyTrend: { date: string; revenue: number }[];
}

interface SalesData {
    todayTransactions: number;
    thisMonthTransactions: number;
    avgTransactionValue: number;
}

interface InventoryData {
    totalValue: number;
    totalMedicines: number;
    outOfStock: number;
    lowStock: number;
    turnoverRate: number;
    stockAccuracy: number;
    fulfillmentRate: number;
}

interface ExpiryData {
    expiring30Days: { count: number; value: number };
    expiring60Days: { count: number; value: number };
    expiring90Days: { count: number; value: number };
}

interface TopSeller {
    name: string;
    units: number;
    revenue: number;
    growth: number;
}

export async function fetchAnalyticsData(): Promise<AnalyticsData> {
    const supabase = createClient();

    // Parallel fetch all data
    const [revenue, sales, inventory, expiry, topSellers, categoryBreakdown] = await Promise.all([
        fetchRevenueData(supabase),
        fetchSalesData(supabase),
        fetchInventoryData(supabase),
        fetchExpiryData(supabase),
        fetchTopSellers(supabase),
        fetchCategoryBreakdown(supabase),
    ]);

    return { revenue, sales, inventory, expiry, topSellers, categoryBreakdown };
}

async function fetchRevenueData(supabase: any): Promise<RevenueData> {
    // Get today's start
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get yesterday's start
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get this week's start (Monday)
    const thisWeekStart = new Date(today);
    const day = thisWeekStart.getDay();
    const diff = thisWeekStart.getDate() - day + (day === 0 ? -6 : 1);
    thisWeekStart.setDate(diff);
    thisWeekStart.setHours(0, 0, 0, 0);

    // Get last week's start
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Get this month's start
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get last month's start
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    // Fetch all revenue data
    const { data: allSales } = await supabase
        .from("sales")
        .select("total, created_at")
        .gte("created_at", lastMonthStart.toISOString());

    if (!allSales) {
        return {
            today: 0,
            yesterday: 0,
            thisWeek: 0,
            lastWeek: 0,
            thisMonth: 0,
            lastMonth: 0,
            dailyTrend: [],
        };
    }

    // Calculate totals
    const todayTotal = allSales
        .filter((s: any) => new Date(s.created_at) >= today)
        .reduce((sum: number, s: any) => sum + (s.total || 0), 0);

    const yesterdayTotal = allSales
        .filter((s: any) => {
            const date = new Date(s.created_at);
            return date >= yesterday && date < today;
        })
        .reduce((sum: number, s: any) => sum + (s.total || 0), 0);

    const thisWeekTotal = allSales
        .filter((s: any) => new Date(s.created_at) >= thisWeekStart)
        .reduce((sum: number, s: any) => sum + (s.total || 0), 0);

    const lastWeekTotal = allSales
        .filter((s: any) => {
            const date = new Date(s.created_at);
            return date >= lastWeekStart && date < thisWeekStart;
        })
        .reduce((sum: number, s: any) => sum + (s.total || 0), 0);

    const thisMonthTotal = allSales
        .filter((s: any) => new Date(s.created_at) >= thisMonthStart)
        .reduce((sum: number, s: any) => sum + (s.total || 0), 0);

    const lastMonthTotal = allSales
        .filter((s: any) => {
            const date = new Date(s.created_at);
            return date >= lastMonthStart && date <= lastMonthEnd;
        })
        .reduce((sum: number, s: any) => sum + (s.total || 0), 0);

    // Calculate daily trend for last 30 days
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyMap: { [key: string]: number } = {};
    allSales
        .filter((s: any) => new Date(s.created_at) >= thirtyDaysAgo)
        .forEach((s: any) => {
            const dateStr = new Date(s.created_at).toISOString().split("T")[0];
            dailyMap[dateStr] = (dailyMap[dateStr] || 0) + (s.total || 0);
        });

    const dailyTrend = Object.entries(dailyMap)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
        today: todayTotal,
        yesterday: yesterdayTotal,
        thisWeek: thisWeekTotal,
        lastWeek: lastWeekTotal,
        thisMonth: thisMonthTotal,
        lastMonth: lastMonthTotal,
        dailyTrend,
    };
}

async function fetchSalesData(supabase: any): Promise<SalesData> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const { data: todaySales } = await supabase
        .from("sales")
        .select("id, total")
        .gte("created_at", today.toISOString());

    const { data: monthSales } = await supabase
        .from("sales")
        .select("id, total")
        .gte("created_at", thisMonthStart.toISOString());

    const todayCount = todaySales?.length || 0;
    const monthCount = monthSales?.length || 0;
    const monthRevenue = monthSales?.reduce((sum: number, s: any) => sum + (s.total || 0), 0) || 0;

    return {
        todayTransactions: todayCount,
        thisMonthTransactions: monthCount,
        avgTransactionValue: monthCount > 0 ? monthRevenue / monthCount : 0,
    };
}

async function fetchInventoryData(supabase: any): Promise<InventoryData> {
    const { data: medicines } = await supabase
        .from("medicines")
        .select(`
            id,
            reorder_level,
            batches (
                quantity,
                cost_price
            )
        `);

    if (!medicines) {
        return {
            totalValue: 0,
            totalMedicines: 0,
            outOfStock: 0,
            lowStock: 0,
            turnoverRate: 0,
            stockAccuracy: 0,
            fulfillmentRate: 0,
        };
    }

    let totalValue = 0;
    let outOfStock = 0;
    let lowStock = 0;

    medicines.forEach((med: any) => {
        const batches = med.batches || [];
        const currentStock = batches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0);
        const stockValue = batches.reduce((sum: number, b: any) => sum + ((b.quantity || 0) * (b.cost_price || 0)), 0);

        totalValue += stockValue;

        if (currentStock === 0) {
            outOfStock++;
        } else if (currentStock < (med.reorder_level || 50)) {
            lowStock++;
        }
    });



    // Real Turnover Rate Calculation (COGS / Average Inventory)
    // We need COGS for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: soldItems } = await supabase
        .from("sale_items")
        .select(`
            quantity,
            batches (cost_price),
            sales!inner (created_at)
        `)
        .gte("sales.created_at", thirtyDaysAgo.toISOString());

    let cogs = 0;
    if (soldItems) {
        soldItems.forEach((item: any) => {
            const cost = item.batches?.cost_price || 0;
            cogs += (item.quantity || 0) * cost;
        });
    }

    // Annualized Turnover = (COGS * 12) / Current Inventory
    // This is an estimation since we don't have historical average inventory yet
    const estimatedAnnualTurnover = totalValue > 0 ? ((cogs * 12) / totalValue) : 0;

    // Fulfillment Rate (Completed vs Total Sales)
    const { count: totalOrders } = await supabase.from("sales").select("*", { count: 'exact', head: true });
    const { count: completedOrders } = await supabase
        .from("sales")
        .select("*", { count: 'exact', head: true })
        .eq("status", "completed");

    // Default to 100% if no status field or valid data
    const fulfillmentRate = totalOrders && totalOrders > 0
        ? ((completedOrders || totalOrders) / totalOrders) * 100
        : 100;

    // Stockout Rate (Real metric instead of fake accuracy)
    const stockoutRate = medicines.length > 0 ? (outOfStock / medicines.length) * 100 : 0;

    return {
        totalValue,
        totalMedicines: medicines.length,
        outOfStock,
        lowStock,
        turnoverRate: parseFloat(estimatedAnnualTurnover.toFixed(1)),
        stockAccuracy: parseFloat((100 - stockoutRate).toFixed(1)), // Inverted stockout for "Availability"
        fulfillmentRate: parseFloat(fulfillmentRate.toFixed(1)),
    };
}

async function fetchExpiryData(supabase: any): Promise<ExpiryData> {
    const now = new Date();
    const thirtyDays = new Date(now);
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const sixtyDays = new Date(now);
    sixtyDays.setDate(sixtyDays.getDate() + 60);
    const ninetyDays = new Date(now);
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    const { data: batches } = await supabase
        .from("batches")
        .select("quantity, selling_price, expiry_date")
        .gte("expiry_date", now.toISOString())
        .lte("expiry_date", ninetyDays.toISOString());

    if (!batches) {
        return {
            expiring30Days: { count: 0, value: 0 },
            expiring60Days: { count: 0, value: 0 },
            expiring90Days: { count: 0, value: 0 },
        };
    }

    let expiring30 = { count: 0, value: 0 };
    let expiring60 = { count: 0, value: 0 };
    let expiring90 = { count: 0, value: 0 };

    batches.forEach((b: any) => {
        const expiryDate = new Date(b.expiry_date);
        const value = (b.quantity || 0) * (b.selling_price || 0);

        if (expiryDate <= thirtyDays) {
            expiring30.count++;
            expiring30.value += value;
        } else if (expiryDate <= sixtyDays) {
            expiring60.count++;
            expiring60.value += value;
        } else if (expiryDate <= ninetyDays) {
            expiring90.count++;
            expiring90.value += value;
        }
    });

    return {
        expiring30Days: expiring30,
        expiring60Days: expiring60,
        expiring90Days: expiring90,
    };
}

async function fetchTopSellers(supabase: any): Promise<TopSeller[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: saleItems } = await supabase
        .from("sale_items")
        .select(`
            quantity,
            unit_price,
            batch_id,
            sales!inner (created_at)
        `)
        .gte("sales.created_at", thirtyDaysAgo.toISOString());

    if (!saleItems) return [];

    // Get unique batch IDs
    const batchIds = [...new Set(saleItems.map((item: any) => item.batch_id))];

    // Fetch medicine info for all batches
    const { data: batches } = await supabase
        .from("batches")
        .select("id, medicine_id, medicines (name)")
        .in("id", batchIds);

    if (!batches) return [];

    // Aggregate by medicine
    const medicineMap: { [key: string]: { name: string; units: number; revenue: number } } = {};

    saleItems.forEach((item: any) => {
        const batch = batches.find((b: any) => b.id === item.batch_id);
        if (batch && batch.medicines) {
            const name = batch.medicines.name;
            if (!medicineMap[name]) {
                medicineMap[name] = { name, units: 0, revenue: 0 };
            }
            medicineMap[name].units += item.quantity || 0;
            medicineMap[name].revenue += (item.quantity || 0) * (item.unit_price || 0);
        }
    });

    // Convert to array and sort
    const topSellers = Object.values(medicineMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((item) => ({
            ...item,
            growth: 0, // Would need historical comparison
        }));

    return topSellers;
}

async function fetchCategoryBreakdown(supabase: any): Promise<CategoryBreakdown[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all sale items with category info
    const { data: saleItems } = await supabase
        .from("sale_items")
        .select(`
            quantity,
            unit_price,
            batch_id,
            sales!inner (created_at)
        `)
        .gte("sales.created_at", thirtyDaysAgo.toISOString());

    if (!saleItems || saleItems.length === 0) return [];

    // Get batch IDs
    const batchIds = [...new Set(saleItems.map((item: any) => item.batch_id))];

    // Fetch categories for batches
    const { data: batches } = await supabase
        .from("batches")
        .select(`
            id,
            medicine_id,
            medicines (
                category_id,
                categories (
                    name,
                    color
                )
            )
        `)
        .in("id", batchIds);

    if (!batches) return [];

    // Aggregate by category
    const categoryMap: { [key: string]: { revenue: number; count: number; color: string } } = {};

    saleItems.forEach((item: any) => {
        const batch = batches.find((b: any) => b.id === item.batch_id);
        if (batch && batch.medicines && batch.medicines.categories) {
            const categoryName = batch.medicines.categories.name;
            const categoryColor = batch.medicines.categories.color;
            const revenue = (item.quantity || 0) * (item.unit_price || 0);

            if (!categoryMap[categoryName]) {
                categoryMap[categoryName] = { revenue: 0, count: 0, color: categoryColor };
            }
            categoryMap[categoryName].revenue += revenue;
            categoryMap[categoryName].count += item.quantity || 0;
        }
    });

    // Calculate total revenue for percentages
    const totalRevenue = Object.values(categoryMap).reduce((sum, cat) => sum + cat.revenue, 0);

    // Convert to array with percentages
    const breakdown = Object.entries(categoryMap)
        .map(([name, data]) => ({
            name,
            value: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
            revenue: data.revenue,
            color: data.color,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6); // Top 6 categories

    return breakdown;
}
