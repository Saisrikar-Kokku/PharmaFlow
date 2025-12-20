"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    AlertTriangle,
    AlertCircle,
    Info,
    Package,
    Calendar,
    Search,
    Filter,
    Clock,
    ExternalLink,
    Bell,
    CheckCircle2,
    XCircle,
    TrendingDown
} from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { toast } from "sonner";
import { GradientText, RevealOnScroll } from "@/components/ui/animated";
import { useRouter } from "next/navigation";

interface ExpiryAlert {
    id: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    medicine_name: string;
    severity: 'expired' | 'critical' | 'warning' | 'info';
    daysUntilExpiry: number;
}

interface StockAlert {
    id: string;
    name: string;
    currentStock: number;
    reorder_level: number;
    severity: 'out-of-stock' | 'critical' | 'warning';
}

export default function AlertsPage() {
    const supabase = useSupabase();
    const router = useRouter();
    const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
    const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"all" | "expiry" | "stock">("all");
    const [filterSeverity, setFilterSeverity] = useState<"all" | "critical" | "warning" | "info">("all");
    const [isLoading, setIsLoading] = useState(true);

    // Fetch expiry alerts
    const fetchExpiryAlerts = async () => {
        try {
            const { data, error } = await supabase
                .from("batches")
                .select(`
                    id,
                    batch_number,
                    expiry_date,
                    quantity,
                    medicines (
                        name
                    )
                `)
                .gte("quantity", 1)
                .order("expiry_date", { ascending: true });

            if (error) throw error;

            const today = new Date();
            const alerts: ExpiryAlert[] = (data || [])
                .map((batch: any) => {
                    const expiryDate = new Date(batch.expiry_date);
                    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    let severity: 'expired' | 'critical' | 'warning' | 'info';
                    if (daysUntilExpiry < 0) severity = 'expired';
                    else if (daysUntilExpiry <= 7) severity = 'critical';
                    else if (daysUntilExpiry <= 30) severity = 'warning';
                    else if (daysUntilExpiry <= 90) severity = 'info';
                    else return null;

                    return {
                        id: batch.id,
                        batch_number: batch.batch_number,
                        expiry_date: batch.expiry_date,
                        quantity: batch.quantity,
                        medicine_name: batch.medicines?.name || "Unknown",
                        severity,
                        daysUntilExpiry
                    };
                })
                .filter(Boolean) as ExpiryAlert[];

            setExpiryAlerts(alerts);
        } catch (error) {
            console.error("Error fetching expiry alerts:", error);
            toast.error("Failed to load expiry alerts");
        }
    };

    // Fetch low stock alerts
    const fetchStockAlerts = async () => {
        try {
            const { data, error } = await supabase
                .from("medicines")
                .select(`
                    id,
                    name,
                    reorder_level,
                    batches (quantity)
                `);

            if (error) throw error;

            const alerts: StockAlert[] = (data || [])
                .map((medicine: any) => {
                    const totalStock = medicine.batches?.reduce((sum: number, batch: any) => sum + batch.quantity, 0) || 0;
                    const reorderLevel = medicine.reorder_level || 10;

                    let severity: 'out-of-stock' | 'critical' | 'warning';
                    if (totalStock === 0) severity = 'out-of-stock';
                    else if (totalStock < reorderLevel * 0.5) severity = 'critical';
                    else if (totalStock < reorderLevel) severity = 'warning';
                    else return null;

                    return {
                        id: medicine.id,
                        name: medicine.name,
                        currentStock: totalStock,
                        reorder_level: reorderLevel,
                        severity
                    };
                })
                .filter(Boolean) as StockAlert[];

            setStockAlerts(alerts);
        } catch (error) {
            console.error("Error fetching stock alerts:", error);
            toast.error("Failed to load stock alerts");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExpiryAlerts();
        fetchStockAlerts();

        // Real-time subscriptions
        const channel = supabase
            .channel("alerts-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "batches" }, () => {
                fetchExpiryAlerts();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "medicines" }, () => {
                fetchStockAlerts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Filter alerts
    const filteredExpiryAlerts = expiryAlerts.filter(alert => {
        const matchesSearch = alert.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            alert.batch_number.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "all" || filterType === "expiry";
        const matchesSeverity = filterSeverity === "all" ||
            (filterSeverity === "critical" && (alert.severity === "expired" || alert.severity === "critical")) ||
            alert.severity === filterSeverity;
        return matchesSearch && matchesType && matchesSeverity;
    });

    const filteredStockAlerts = stockAlerts.filter(alert => {
        const matchesSearch = alert.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "all" || filterType === "stock";
        const matchesSeverity = filterSeverity === "all" ||
            (filterSeverity === "critical" && (alert.severity === "out-of-stock" || alert.severity === "critical")) ||
            (filterSeverity === "warning" && alert.severity === "warning");
        return matchesSearch && matchesType && matchesSeverity;
    });

    // Stats
    const criticalCount = expiryAlerts.filter(a => a.severity === "expired" || a.severity === "critical").length +
        stockAlerts.filter(a => a.severity === "out-of-stock" || a.severity === "critical").length;
    const warningCount = expiryAlerts.filter(a => a.severity === "warning").length +
        stockAlerts.filter(a => a.severity === "warning").length;
    const totalAlerts = expiryAlerts.length + stockAlerts.length;

    // Severity config
    const getSeverityConfig = (severity: string) => {
        switch (severity) {
            case "expired":
            case "out-of-stock":
                return { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", label: severity === "expired" ? "Expired" : "Out of Stock" };
            case "critical":
                return { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", label: "Critical" };
            case "warning":
                return { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", label: "Warning" };
            case "info":
                return { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Info" };
            default:
                return { icon: Bell, color: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/20", label: "Alert" };
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <RevealOnScroll>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">
                            <GradientText>Alerts & Notifications</GradientText>
                        </h1>
                        <p className="text-muted-foreground">
                            Monitor expiry dates and stock levels in real-time
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-lg px-4 py-2">
                            <Bell className="w-4 h-4 mr-2" />
                            {totalAlerts} Active
                        </Badge>
                    </div>
                </div>
            </RevealOnScroll>

            {/* Stats Cards */}
            <RevealOnScroll delay={0.1}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="glass-card border-red-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Critical Alerts</p>
                                    <p className="text-3xl font-bold text-red-500">{criticalCount}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-red-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-orange-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Warnings</p>
                                    <p className="text-3xl font-bold text-orange-500">{warningCount}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                    <AlertCircle className="w-6 h-6 text-orange-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Total Alerts</p>
                                    <p className="text-3xl font-bold text-primary">{totalAlerts}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Bell className="w-6 h-6 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </RevealOnScroll>

            {/* Filters */}
            <RevealOnScroll delay={0.2}>
                <Card className="glass-card">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search alerts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="expiry">Expiry Alerts</SelectItem>
                                    <SelectItem value="stock">Stock Alerts</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filterSeverity} onValueChange={(value: any) => setFilterSeverity(value)}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Severity</SelectItem>
                                    <SelectItem value="critical">Critical Only</SelectItem>
                                    <SelectItem value="warning">Warning Only</SelectItem>
                                    <SelectItem value="info">Info Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </RevealOnScroll>

            {/* Alerts List */}
            <div className="space-y-4">
                {isLoading ? (
                    <Card className="glass-card">
                        <CardContent className="py-12 text-center">
                            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                            <p className="text-muted-foreground">Loading alerts...</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Expiry Alerts */}
                        {(filterType === "all" || filterType === "expiry") && filteredExpiryAlerts.length > 0 && (
                            <RevealOnScroll delay={0.3}>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-primary" />
                                        <h2 className="text-xl font-semibold">Expiry Alerts</h2>
                                        <Badge variant="secondary">{filteredExpiryAlerts.length}</Badge>
                                    </div>
                                    <AnimatePresence mode="popLayout">
                                        {filteredExpiryAlerts.map((alert, index) => {
                                            const config = getSeverityConfig(alert.severity);
                                            const Icon = config.icon;
                                            return (
                                                <motion.div
                                                    key={alert.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -20 }}
                                                    transition={{ delay: index * 0.05 }}
                                                >
                                                    <Card className={`glass-card border ${config.border} hover:shadow-lg transition-all`}>
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex items-start gap-4 flex-1">
                                                                    <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                                                                        <Icon className={`w-6 h-6 ${config.color}`} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <h3 className="font-semibold text-lg truncate">{alert.medicine_name}</h3>
                                                                            <Badge className={config.bg + " " + config.color + " border-0"}>
                                                                                {config.label}
                                                                            </Badge>
                                                                        </div>
                                                                        <p className="text-sm text-muted-foreground mb-2">
                                                                            Batch: {alert.batch_number} • Quantity: {alert.quantity} units
                                                                        </p>
                                                                        <div className="flex items-center gap-4 text-sm">
                                                                            <div className="flex items-center gap-1">
                                                                                <Clock className="w-4 h-4" />
                                                                                <span>
                                                                                    {alert.daysUntilExpiry < 0
                                                                                        ? `Expired ${Math.abs(alert.daysUntilExpiry)} days ago`
                                                                                        : `Expires in ${alert.daysUntilExpiry} days`
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <Calendar className="w-4 h-4" />
                                                                                <span>{new Date(alert.expiry_date).toLocaleDateString()}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => router.push("/dashboard/inventory")}
                                                                >
                                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                                    View
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </RevealOnScroll>
                        )}

                        {/* Stock Alerts */}
                        {(filterType === "all" || filterType === "stock") && filteredStockAlerts.length > 0 && (
                            <RevealOnScroll delay={0.4}>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-5 h-5 text-primary" />
                                        <h2 className="text-xl font-semibold">Stock Alerts</h2>
                                        <Badge variant="secondary">{filteredStockAlerts.length}</Badge>
                                    </div>
                                    <AnimatePresence mode="popLayout">
                                        {filteredStockAlerts.map((alert, index) => {
                                            const config = getSeverityConfig(alert.severity);
                                            const Icon = config.icon;
                                            const percentage = Math.round((alert.currentStock / alert.reorder_level) * 100);
                                            return (
                                                <motion.div
                                                    key={alert.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -20 }}
                                                    transition={{ delay: index * 0.05 }}
                                                >
                                                    <Card className={`glass-card border ${config.border} hover:shadow-lg transition-all`}>
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex items-start gap-4 flex-1">
                                                                    <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                                                                        <Icon className={`w-6 h-6 ${config.color}`} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <h3 className="font-semibold text-lg truncate">{alert.name}</h3>
                                                                            <Badge className={config.bg + " " + config.color + " border-0"}>
                                                                                {config.label}
                                                                            </Badge>
                                                                        </div>
                                                                        <p className="text-sm text-muted-foreground mb-3">
                                                                            Current: {alert.currentStock} units • Reorder Level: {alert.reorder_level} units
                                                                        </p>
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center justify-between text-xs">
                                                                                <span className="text-muted-foreground">Stock Level</span>
                                                                                <span className={config.color + " font-semibold"}>{percentage}%</span>
                                                                            </div>
                                                                            <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
                                                                                <div
                                                                                    className={`h-full ${config.color.replace('text', 'bg')} transition-all`}
                                                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => router.push("/dashboard/inventory")}
                                                                >
                                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                                    Restock
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </RevealOnScroll>
                        )}

                        {/* Empty State */}
                        {filteredExpiryAlerts.length === 0 && filteredStockAlerts.length === 0 && (
                            <Card className="glass-card">
                                <CardContent className="py-16 text-center">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">All Clear!</h3>
                                    <p className="text-muted-foreground">
                                        {searchQuery || filterType !== "all" || filterSeverity !== "all"
                                            ? "No alerts match your filters"
                                            : "No alerts at the moment. Your inventory is in good shape!"
                                        }
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
