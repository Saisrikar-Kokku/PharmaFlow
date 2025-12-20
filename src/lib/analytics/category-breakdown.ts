interface CategoryBreakdown {
    name: string;
    value: number;
    revenue: number;
    color: string;
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
