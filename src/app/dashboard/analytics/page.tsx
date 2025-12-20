"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GradientText, RevealOnScroll, TiltCard } from "@/components/ui/animated";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    ShoppingCart,
    Users,
    Calendar,
    Download,
    ArrowUpRight,
    ArrowDownRight,
    Pill,
    AlertTriangle,
    Clock,
    Target,
    Zap,
    Loader2,
    CheckCircle,
} from "lucide-react";
import { fetchAnalyticsData } from "@/lib/analytics/fetch-analytics";
import { toast } from "sonner";

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState("30");

    useEffect(() => {
        loadAnalytics();
    }, [selectedPeriod]);

    async function loadAnalytics() {
        try {
            setLoading(true);
            const analyticsData = await fetchAnalyticsData(parseInt(selectedPeriod));
            setData(analyticsData);
        } catch (error) {
            console.error("Error loading analytics:", error);
            toast.error("Failed to load analytics data");
        } finally {
            setLoading(false);
        }
    }

    function handleExport() {
        if (!data) return;

        const csvRows = [
            ["PharmaFlow Analytics Report", `Generated: ${new Date().toLocaleString()}`],
            [],
            ["=== REVENUE ==="],
            ["Today's Revenue", `₹${data.revenue.today.toLocaleString()}`],
            ["This Week", `₹${data.revenue.thisWeek.toLocaleString()}`],
            ["This Month", `₹${data.revenue.thisMonth.toLocaleString()}`],
            ["Last Month", `₹${data.revenue.lastMonth.toLocaleString()}`],
            [],
            ["=== SALES ==="],
            ["Today's Transactions", data.sales.todayTransactions],
            ["Monthly Transactions", data.sales.thisMonthTransactions],
            ["Avg Transaction Value", `₹${data.sales.avgTransactionValue.toFixed(2)}`],
            [],
            ["=== INVENTORY ==="],
            ["Total Medicines", data.inventory.totalMedicines],
            ["Total Value", `₹${data.inventory.totalValue.toLocaleString()}`],
            ["Inventory Turnover", `${data.inventory.turnoverRate}x`],
            ["Out of Stock", data.inventory.outOfStock],
            ["Low Stock", data.inventory.lowStock],
            [],
            ["=== EXPIRY ALERTS ==="],
            ["Expiring in 30 days", `${data.expiry.expiring30Days.count} items (₹${data.expiry.expiring30Days.value.toLocaleString()})`],
            ["Expiring in 60 days", `${data.expiry.expiring60Days.count} items (₹${data.expiry.expiring60Days.value.toLocaleString()})`],
            [],
            ["=== TOP SELLERS ==="],
            ["Medicine", "Units Sold", "Revenue"],
            ...data.topSellers.map((med: any) => [med.name, med.units, `₹${med.revenue.toLocaleString()}`]),
        ];

        const csvContent = csvRows.map(row => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `PharmaFlow_Analytics_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        toast.success("Analytics exported successfully!");
    }

    if (loading) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground mt-4">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
                    <p className="text-muted-foreground mt-4">Failed to load analytics data</p>
                    <Button onClick={loadAnalytics} className="mt-4">Retry</Button>
                </div>
            </div>
        );
    }

    const revenueGrowth = data.revenue.lastMonth > 0
        ? ((data.revenue.thisMonth - data.revenue.lastMonth) / data.revenue.lastMonth * 100).toFixed(1)
        : 0;
    const weeklyGrowth = data.revenue.lastWeek > 0
        ? ((data.revenue.thisWeek - data.revenue.lastWeek) / data.revenue.lastWeek * 100).toFixed(1)
        : 0;

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-primary" />
                        <GradientText>Analytics</GradientText>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Insights to optimize your pharmacy performance
                    </p>
                </motion.div>

                <motion.div
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-[150px] bg-background/50">
                            <Calendar className="w-4 h-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                            <SelectItem value="365">Last year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleExport} className="gap-2 bg-gradient-to-r from-primary to-pharma-emerald hover:opacity-90">
                        <Download className="w-4 h-4" />
                        Export
                    </Button>
                </motion.div>
            </div>

            {/* Revenue Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: "Today's Revenue",
                        value: `₹${(data.revenue.today / 1000).toFixed(1)}K`,
                        change: data.revenue.yesterday > 0 ? ((data.revenue.today - data.revenue.yesterday) / data.revenue.yesterday * 100).toFixed(0) : "0",
                        icon: DollarSign,
                        color: "from-emerald-500 to-teal-500"
                    },
                    {
                        label: "This Week",
                        value: `₹${(data.revenue.thisWeek / 1000).toFixed(0)}K`,
                        change: weeklyGrowth,
                        icon: TrendingUp,
                        color: "from-blue-500 to-cyan-500"
                    },
                    {
                        label: "This Month",
                        value: `₹${(data.revenue.thisMonth / 1000).toFixed(0)}K`,
                        change: revenueGrowth,
                        icon: BarChart3,
                        color: "from-purple-500 to-violet-500"
                    },
                    {
                        label: "Transactions",
                        value: data.sales.thisMonthTransactions.toLocaleString(),
                        change: "0",
                        icon: ShoppingCart,
                        color: "from-amber-500 to-orange-500"
                    },
                ].map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <TiltCard>
                            <Card className="glass-card border-white/10">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                                            <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                {Number(stat.change) >= 0 ? (
                                                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                                ) : (
                                                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                                                )}
                                                <span className={Number(stat.change) >= 0 ? "text-emerald-500" : "text-red-500"}>
                                                    {stat.change}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                            <stat.icon className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TiltCard>
                    </motion.div>
                ))}
            </div>

            {/* Main Analytics Grid */}
            <Tabs defaultValue="sales" className="space-y-6">
                <TabsList className="bg-accent/50">
                    <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
                    <TabsTrigger value="inventory">Inventory Metrics</TabsTrigger>
                    <TabsTrigger value="waste">Waste Prevention</TabsTrigger>
                </TabsList>

                {/* Sales Analytics */}
                <TabsContent value="sales" className="space-y-6 mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Selling */}
                        <RevealOnScroll>
                            <Card className="glass-card border-white/10 h-full">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Pill className="w-5 h-5 text-primary" />
                                        Top Selling Medicines
                                    </CardTitle>
                                    <CardDescription>By units sold this month</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {data.topSellers.slice(0, 5).map((med: any, index: number) => (
                                        <motion.div
                                            key={med.name}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center gap-4 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-pharma-emerald flex items-center justify-center text-white font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{med.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {med.units.toLocaleString()} units • ₹{med.revenue.toLocaleString()}
                                                </p>
                                            </div>
                                            <Badge className={med.growth >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}>
                                                {med.growth >= 0 ? "+" : ""}{med.growth}%
                                            </Badge>
                                        </motion.div>
                                    ))}
                                </CardContent>
                            </Card>
                        </RevealOnScroll>

                        {/* Category Breakdown */}
                        <RevealOnScroll direction="right">
                            <Card className="glass-card border-white/10 h-full">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-primary" />
                                        Category Breakdown
                                    </CardTitle>
                                    <CardDescription>Sales distribution by category</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {data.categoryBreakdown && data.categoryBreakdown.length > 0 ? (
                                        data.categoryBreakdown.map((cat: any, index: number) => (
                                            <motion.div
                                                key={cat.name}
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: "100%" }}
                                                transition={{ delay: index * 0.1 }}
                                                className="space-y-2"
                                            >
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-medium">{cat.name}</span>
                                                    <span className="text-muted-foreground">{cat.value}%</span>
                                                </div>
                                                <div className="h-3 bg-accent rounded-full overflow-hidden">
                                                    <motion.div
                                                        className={`h-full ${cat.color} rounded-full`}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${cat.value}%` }}
                                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                                    />
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground text-center py-8">No sales data for category breakdown.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </RevealOnScroll>
                    </div>
                </TabsContent>

                {/* Inventory Metrics */}
                <TabsContent value="inventory" className="space-y-6 mt-0">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <Card className="glass-card border-white/10">
                                <CardContent className="p-5 text-center">
                                    <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3`}>
                                        <TrendingUp className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-3xl font-bold">{data.inventory.turnoverRate.toFixed(1)}x</p>
                                    <p className="text-sm font-medium mt-1">Inventory Turnover</p>
                                    <p className="text-xs text-muted-foreground mt-1">{(365 / data.inventory.turnoverRate).toFixed(0)} days avg</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="glass-card border-white/10">
                                <CardContent className="p-5 text-center">
                                    <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-3`}>
                                        <Package className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-3xl font-bold">{data.inventory.totalMedicines}</p>
                                    <p className="text-sm font-medium mt-1">Total Medicines</p>
                                    <p className="text-xs text-muted-foreground mt-1">₹{data.inventory.totalValue.toLocaleString()}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card className="glass-card border-white/10">
                                <CardContent className="p-5 text-center">
                                    <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-3`}>
                                        <CheckCircle className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-3xl font-bold">{data.inventory.stockAccuracy}%</p>
                                    <p className="text-sm font-medium mt-1">Stock Accuracy</p>
                                    <p className="text-xs text-muted-foreground mt-1">System vs physical</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card className="glass-card border-white/10">
                                <CardContent className="p-5 text-center">
                                    <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center mb-3`}>
                                        <Zap className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-3xl font-bold">{data.inventory.fulfillmentRate}%</p>
                                    <p className="text-sm font-medium mt-1">Fulfillment Rate</p>
                                    <p className="text-xs text-muted-foreground mt-1">Orders completed</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </TabsContent>

                {/* Waste Prevention */}
                <TabsContent value="waste" className="space-y-6 mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Waste Stats */}
                        <RevealOnScroll>
                            <Card className="glass-card border-white/10 border-l-4 border-l-red-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                        Expired Stock
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold text-red-500">₹{data.expiry.expiring60Days.value.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{data.expiry.expiring60Days.count} units this month</p>
                                </CardContent>
                            </Card>
                        </RevealOnScroll>

                        <RevealOnScroll>
                            <Card className="glass-card border-white/10 border-l-4 border-l-amber-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-amber-500" />
                                        Near Expiry
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold text-amber-500">₹{data.expiry.expiring30Days.value.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{data.expiry.expiring30Days.count} units expiring in 30 days</p>
                                </CardContent>
                            </Card>
                        </RevealOnScroll>

                        <RevealOnScroll>
                            <Card className="glass-card border-white/10 border-l-4 border-l-emerald-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                                        FEFO Savings
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold text-emerald-500">₹{data.inventory.totalValue.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">Total inventory value</p>
                                </CardContent>
                            </Card>
                        </RevealOnScroll>
                    </div>

                    {/* FEFO Impact */}
                    <RevealOnScroll>
                        <Card className="glass-card border-white/10">
                            <CardHeader>
                                <CardTitle className="text-lg">FEFO Implementation Impact</CardTitle>
                                <CardDescription>First-Expired-First-Out smart shelf management</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                                        <p className="text-4xl font-bold text-emerald-500">
                                            {data.inventory.totalMedicines > 0
                                                ? Math.round((1 - (data.expiry.expiring30Days.count / Math.max(data.inventory.totalMedicines, 1))) * 100)
                                                : 100}%
                                        </p>
                                        <p className="text-sm mt-2">Stock Freshness Rate</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                                        <p className="text-4xl font-bold text-blue-500">
                                            ₹{((data.expiry.expiring30Days.value + data.expiry.expiring60Days.value) / 1000).toFixed(0)}K
                                        </p>
                                        <p className="text-sm mt-2">At-Risk Value (60 days)</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20">
                                        <p className="text-4xl font-bold text-purple-500">{data.inventory.fulfillmentRate}%</p>
                                        <p className="text-sm mt-2">Order Fulfillment Rate</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </RevealOnScroll>
                </TabsContent>
            </Tabs>
        </div>
    );
}
