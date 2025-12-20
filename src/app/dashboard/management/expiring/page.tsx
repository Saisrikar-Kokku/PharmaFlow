"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { GradientText } from "@/components/ui/animated";
import {
    AlertTriangle,
    Calendar,
    Package,
    Search,
    Loader2,
    Clock,
    XCircle,
    AlertCircle,
    Trash2,
    Filter,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ExpiringBatch {
    id: string;
    batch_number: string;
    quantity: number;
    expiry_date: string;
    medicine_id: string;
    medicines: {
        id: string;
        name: string;
        sku: string;
    } | null;
    daysUntilExpiry: number;
}

export default function ExpiringPage() {
    const [batches, setBatches] = useState<ExpiringBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterDays, setFilterDays] = useState<string>("30");

    const supabase = createClient();

    useEffect(() => {
        fetchExpiringBatches();
    }, [filterDays]);

    async function fetchExpiringBatches() {
        try {
            setLoading(true);
            const today = new Date();
            const daysFilter = parseInt(filterDays);
            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + daysFilter);

            const { data, error } = await supabase
                .from("batches")
                .select(`
                    id,
                    batch_number,
                    quantity,
                    expiry_date,
                    medicine_id,
                    medicines(id, name, sku)
                `)
                .lte("expiry_date", futureDate.toISOString().split("T")[0])
                .gt("quantity", 0)
                .order("expiry_date", { ascending: true });

            if (error) throw error;

            // Calculate days until expiry
            const batchesWithDays = ((data || []) as any[]).map((batch: any) => {
                const expiryDate = new Date(batch.expiry_date);
                const timeDiff = expiryDate.getTime() - today.getTime();
                const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                return { ...batch, daysUntilExpiry };
            });

            setBatches(batchesWithDays as ExpiringBatch[]);
        } catch (error) {
            console.error("Error fetching expiring batches:", error);
            toast.error("Failed to load expiring batches");
        } finally {
            setLoading(false);
        }
    }

    async function handleDisposeBatch(batch: ExpiringBatch) {
        if (!confirm(`Dispose batch ${batch.batch_number} (${batch.quantity} units)?`)) return;

        try {
            const { error } = await supabase
                .from("batches")
                .update({ quantity: 0, status: "disposed" } as any)
                .eq("id", batch.id);

            if (error) throw error;
            toast.success("Batch marked as disposed");
            fetchExpiringBatches();
        } catch (error) {
            console.error("Error disposing batch:", error);
            toast.error("Failed to dispose batch");
        }
    }

    const filteredBatches = batches.filter((batch) =>
        batch.medicines?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.batch_number.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const expiredCount = batches.filter((b) => b.daysUntilExpiry <= 0).length;
    const criticalCount = batches.filter((b) => b.daysUntilExpiry > 0 && b.daysUntilExpiry <= 7).length;
    const warningCount = batches.filter((b) => b.daysUntilExpiry > 7 && b.daysUntilExpiry <= 30).length;
    const totalValue = batches.reduce((sum, b) => sum + b.quantity, 0);

    function getExpiryStatus(days: number) {
        if (days <= 0) return { label: "Expired", color: "bg-red-500/10 text-red-500 border-red-500/30", icon: XCircle };
        if (days <= 7) return { label: `${days}d left`, color: "bg-orange-500/10 text-orange-500 border-orange-500/30", icon: AlertTriangle };
        if (days <= 30) return { label: `${days}d left`, color: "bg-amber-500/10 text-amber-500 border-amber-500/30", icon: AlertCircle };
        return { label: `${days}d left`, color: "bg-blue-500/10 text-blue-500 border-blue-500/30", icon: Clock };
    }

    if (loading) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground mt-4">Loading expiring batches...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-amber-500" />
                        <GradientText>Expiring Soon</GradientText>
                    </h1>
                    <p className="text-muted-foreground mt-1">Monitor and manage expiring inventory</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-3"
                >
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search medicine..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-64"
                        />
                    </div>
                    <Select value={filterDays} onValueChange={setFilterDays}>
                        <SelectTrigger className="w-40">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Next 7 days</SelectItem>
                            <SelectItem value="14">Next 14 days</SelectItem>
                            <SelectItem value="30">Next 30 days</SelectItem>
                            <SelectItem value="60">Next 60 days</SelectItem>
                            <SelectItem value="90">Next 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                </motion.div>
            </div>

            {/* Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4 flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-red-500" />
                        <div>
                            <p className="text-sm text-muted-foreground">Expired</p>
                            <p className="text-2xl font-bold text-red-500">{expiredCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <div>
                            <p className="text-sm text-muted-foreground">Critical (≤7d)</p>
                            <p className="text-2xl font-bold text-orange-500">{criticalCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <div>
                            <p className="text-sm text-muted-foreground">Warning (≤30d)</p>
                            <p className="text-2xl font-bold text-amber-500">{warningCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Package className="w-5 h-5 text-primary" />
                        <div>
                            <p className="text-sm text-muted-foreground">Total Units</p>
                            <p className="text-2xl font-bold">{totalValue}</p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Batches List */}
            <Card className="glass-card border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Expiring Batches ({filteredBatches.length})
                    </CardTitle>
                    <CardDescription>Batches expiring within {filterDays} days</CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredBatches.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No expiring batches found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence>
                                {filteredBatches.map((batch, index) => {
                                    const status = getExpiryStatus(batch.daysUntilExpiry);
                                    const StatusIcon = status.icon;
                                    return (
                                        <motion.div
                                            key={batch.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ delay: index * 0.03 }}
                                            className={`flex items-center justify-between p-4 rounded-lg border ${status.color} bg-opacity-50`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center">
                                                    <StatusIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{batch.medicines?.name || "Unknown"}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Batch: {batch.batch_number} • SKU: {batch.medicines?.sku || "N/A"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="font-medium">{batch.quantity} units</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Expires: {new Date(batch.expiry_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <Badge className={status.color}>{status.label}</Badge>
                                                {batch.daysUntilExpiry <= 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => handleDisposeBatch(batch)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* FEFO Reminder */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <Card className="glass-card border-amber-500/20 bg-amber-500/5">
                    <CardContent className="p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-amber-500">FEFO Reminder</p>
                            <p className="text-sm text-muted-foreground">
                                First Expiry, First Out: Always sell batches with earlier expiry dates first.
                                The Sales page automatically selects the oldest batch.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
