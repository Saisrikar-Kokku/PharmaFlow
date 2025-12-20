"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TiltCard, GradientText, RevealOnScroll } from "@/components/ui/animated";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getDashboardStats,
    getRecentAlerts,
    getExpiringBatches,
    getQuickStats,
} from "@/services/dashboard";
import {
    Package,
    TrendingUp,
    AlertTriangle,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Pill,
    DollarSign,
    ShoppingCart,
    Bell,
    ChevronRight,
    Calendar,
    Activity,
    AlertCircle,
    Info,
} from "lucide-react";

interface DashboardStats {
    totalMedicines: number;
    lowStockCount: number;
    expiringCount: number;
    todaySales: number;
    unresolvedAlerts: number;
}

interface QuickStats {
    stockValue: number;
    todaySales: number;
    transactionCount: number;
}

interface Alert {
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    created_at: string;
    medicine?: { name: string } | null;
}

interface ExpiringBatch {
    id: string;
    medicine_name: string;
    batch_number: string;
    quantity: number;
    days_until_expiry: number;
    expiry_status: string;
}

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
}

function StatCard({
    stat,
    index,
    loading
}: {
    stat: { title: string; value: string | number; change?: string; changeType?: "positive" | "negative"; icon: React.ElementType; color: string };
    index: number;
    loading: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
        >
            <TiltCard>
                <Card className="glass-card border-white/10 hover:border-primary/30 transition-all group overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                                {loading ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <p className="text-3xl font-bold">{stat.value}</p>
                                )}
                                {stat.change && !loading && (
                                    <div className="flex items-center gap-1 mt-2">
                                        {stat.changeType === "positive" ? (
                                            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <ArrowDownRight className="w-4 h-4 text-red-500" />
                                        )}
                                        <span className={stat.changeType === "positive" ? "text-emerald-500" : "text-red-500"}>
                                            {stat.change}
                                        </span>
                                        <span className="text-xs text-muted-foreground">vs last week</span>
                                    </div>
                                )}
                            </div>
                            <motion.div
                                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                                whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                                <stat.icon className="w-6 h-6 text-white" />
                            </motion.div>
                        </div>
                    </CardContent>
                </Card>
            </TiltCard>
        </motion.div>
    );
}

function AlertItem({ alert, index }: { alert: Alert; index: number }) {
    const severityColors = {
        critical: "border-l-red-500 bg-red-500/5",
        warning: "border-l-amber-500 bg-amber-500/5",
        info: "border-l-blue-500 bg-blue-500/5",
    };

    const severityBadge = {
        critical: "bg-red-500/10 text-red-500",
        warning: "bg-amber-500/10 text-amber-500",
        info: "bg-blue-500/10 text-blue-500",
    };

    const severityIcons = {
        critical: AlertCircle,
        warning: AlertTriangle,
        info: Info,
    };

    const severity = alert.severity as keyof typeof severityColors;
    const SeverityIcon = severityIcons[severity] || Info;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`p-4 rounded-lg border-l-4 ${severityColors[severity] || severityColors.info}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <SeverityIcon className={`w-5 h-5 mt-0.5 ${severityBadge[severity]?.split(' ')[1] || 'text-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">{alert.title}</h4>
                            <Badge variant="secondary" className={`text-xs ${severityBadge[severity] || severityBadge.info}`}>
                                {alert.severity}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                        {alert.medicine?.name && (
                            <Badge variant="outline" className="mt-2 text-xs">
                                <Pill className="w-3 h-3 mr-1" />
                                {alert.medicine.name}
                            </Badge>
                        )}
                    </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(alert.created_at)}
                </span>
            </div>
        </motion.div>
    );
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsData, quickStatsData, alertsData, expiringData] = await Promise.all([
                    getDashboardStats(),
                    getQuickStats(),
                    getRecentAlerts(5),
                    getExpiringBatches(5),
                ]);

                setStats(statsData);
                setQuickStats(quickStatsData);
                setAlerts(alertsData);
                setExpiringBatches(expiringData);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const statCards = [
        {
            title: "Total Medicines",
            value: stats?.totalMedicines || 0,
            change: "+12%",
            changeType: "positive" as const,
            icon: Pill,
            color: "from-blue-500 to-cyan-500",
        },
        {
            title: "Low Stock Items",
            value: stats?.lowStockCount || 0,
            change: stats?.lowStockCount ? `${stats.lowStockCount} items` : undefined,
            changeType: "negative" as const,
            icon: Package,
            color: "from-amber-500 to-orange-500",
        },
        {
            title: "Expiring Soon",
            value: stats?.expiringCount || 0,
            changeType: "positive" as const,
            icon: Clock,
            color: "from-red-500 to-rose-500",
        },
        {
            title: "Today's Sales",
            value: `₹${(stats?.todaySales || 0).toLocaleString()}`,
            change: "+18%",
            changeType: "positive" as const,
            icon: DollarSign,
            color: "from-emerald-500 to-teal-500",
        },
    ];

    return (
        <div className="p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-3xl font-bold">
                        Welcome back, <GradientText>Pharmacist</GradientText>
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4" />
                        {currentDate}
                    </p>
                </motion.div>

                <motion.div
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <Link href="/dashboard/sales">
                        <Button variant="outline" className="gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            New Sale
                        </Button>
                    </Link>
                    <Link href="/dashboard/inventory">
                        <Button className="gap-2 bg-gradient-to-r from-primary to-pharma-emerald hover:opacity-90">
                            <Package className="w-4 h-4" />
                            Add Stock
                        </Button>
                    </Link>
                </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => (
                    <StatCard key={stat.title} stat={stat} index={index} loading={loading} />
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Alerts Panel */}
                <RevealOnScroll className="lg:col-span-2">
                    <Card className="glass-card border-white/10 h-full">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-primary" />
                                    Recent Alerts
                                    {stats?.unresolvedAlerts ? (
                                        <Badge className="bg-red-500 text-white ml-2">
                                            {stats.unresolvedAlerts} unresolved
                                        </Badge>
                                    ) : null}
                                </CardTitle>
                                <CardDescription>Stay on top of your inventory</CardDescription>
                            </div>
                            <Link href="/dashboard/alerts">
                                <Button variant="ghost" size="sm" className="text-primary">
                                    View All
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} className="h-20 w-full" />
                                ))
                            ) : alerts.length > 0 ? (
                                alerts.map((alert, index) => (
                                    <AlertItem key={alert.id} alert={alert} index={index} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>No recent alerts</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </RevealOnScroll>

                {/* Quick Stats */}
                <RevealOnScroll direction="right">
                    <Card className="glass-card border-white/10 h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" />
                                Quick Stats
                            </CardTitle>
                            <CardDescription>Today&apos;s performance</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-pharma-emerald/10 border border-primary/20">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Revenue</span>
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                </div>
                                {loading ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <>
                                        <p className="text-2xl font-bold">₹{(quickStats?.todaySales || 0).toLocaleString()}</p>
                                        <p className="text-xs text-emerald-500">Today&apos;s total</p>
                                    </>
                                )}
                            </div>

                            <div className="p-4 rounded-xl bg-accent/50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Transactions</span>
                                    <ShoppingCart className="w-4 h-4 text-blue-500" />
                                </div>
                                {loading ? (
                                    <Skeleton className="h-8 w-16" />
                                ) : (
                                    <>
                                        <p className="text-2xl font-bold">{quickStats?.transactionCount || 0}</p>
                                        <p className="text-xs text-muted-foreground">Orders processed today</p>
                                    </>
                                )}
                            </div>

                            <div className="p-4 rounded-xl bg-accent/50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Stock Value</span>
                                    <Package className="w-4 h-4 text-purple-500" />
                                </div>
                                {loading ? (
                                    <Skeleton className="h-8 w-20" />
                                ) : (
                                    <>
                                        <p className="text-2xl font-bold">
                                            ₹{((quickStats?.stockValue || 0) / 100000).toFixed(1)}L
                                        </p>
                                        <p className="text-xs text-muted-foreground">Total inventory worth</p>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </RevealOnScroll>
            </div>

            {/* Second Row - Expiring Soon */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expiring Soon */}
                <RevealOnScroll>
                    <Card className="glass-card border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    Expiring Soon (FEFO)
                                </CardTitle>
                                <CardDescription>Prioritize these for sale</CardDescription>
                            </div>
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
                                {expiringBatches.length} batches
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <Skeleton key={i} className="h-14 w-full" />
                                    ))
                                ) : expiringBatches.length > 0 ? (
                                    expiringBatches.map((batch, index) => (
                                        <motion.div
                                            key={batch.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.05 }}
                                            className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{batch.medicine_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Batch: {batch.batch_number} • {batch.quantity} units
                                                </p>
                                            </div>
                                            <Badge
                                                className={batch.expiry_status === "critical" || batch.expiry_status === "expired"
                                                    ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                                    : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                                }
                                            >
                                                {batch.days_until_expiry <= 0 ? "Expired" : `${batch.days_until_expiry} days`}
                                            </Badge>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p>No batches expiring soon</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </RevealOnScroll>

                {/* Summary Card */}
                <RevealOnScroll direction="right">
                    <Card className="glass-card border-white/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" />
                                Inventory Summary
                            </CardTitle>
                            <CardDescription>Current stock overview</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                    <p className="text-3xl font-bold text-emerald-500">{stats?.totalMedicines || 0}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Total Medicines</p>
                                </div>
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                                    <p className="text-3xl font-bold text-amber-500">{stats?.lowStockCount || 0}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Low Stock</p>
                                </div>
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                                    <p className="text-3xl font-bold text-red-500">{stats?.expiringCount || 0}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Expiring Soon</p>
                                </div>
                                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                                    <p className="text-3xl font-bold text-blue-500">{stats?.unresolvedAlerts || 0}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Active Alerts</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </RevealOnScroll>
            </div>
        </div>
    );
}
