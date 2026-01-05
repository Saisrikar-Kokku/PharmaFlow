"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select as SelectUI,
    SelectContent as SelectContentUI,
    SelectItem as SelectItemUI,
    SelectTrigger as SelectTriggerUI,
    SelectValue as SelectValueUI
} from "@/components/ui/select";
import { GradientText, RevealOnScroll, TiltCard } from "@/components/ui/animated";
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    Target,
    Package,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    Download,
    Sparkles,
    CloudRain,
    Sun,
    Snowflake,
    ThermometerSnowflake,
    Zap,
    Loader2,
    FileText,
    Truck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { PermissionDenied, hasPermission, UserRole } from "@/lib/permissions";

// Types
interface ForecastItem {
    id: string;
    medicine: string;
    medicineId: string;
    currentStock: number;
    forecastedDemand: number;
    reorderQty: number;
    confidence: number;
    trend: "up" | "down" | "stable";
    seasonalFactor: number;
    reason: string;
    period: string;
    avgWeeklySales: number;
    reorderLevel: number;
    // AI-specific fields
    aiAnalysis?: {
        forecastedDemand: number;
        confidence: number;
        trend: "up" | "down" | "stable";
        reasoning: string;
        seasonalFactor: number;
    };
    salesHistory?: number[];
}

interface AIAnalysisState {
    [medicineId: string]: {
        loading: boolean;
        data?: ForecastItem["aiAnalysis"];
        error?: string;
    };
}

interface Supplier {
    id: string;
    name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
}

// Seasonal patterns data (status is calculated dynamically)
const seasonalPatternsData = [
    {
        season: "Monsoon",
        icon: CloudRain,
        color: "from-blue-500 to-cyan-500",
        medicines: ["ORS Powder", "Paracetamol", "Cetirizine", "Cough Syrup"],
        multiplier: "1.5-2.5x",
        months: [6, 7, 8, 9], // July-October (0-indexed)
    },
    {
        season: "Winter",
        icon: Snowflake,
        color: "from-slate-400 to-blue-400",
        medicines: ["Vitamin D3", "Cold & Flu meds", "Cough Syrup"],
        multiplier: "1.3-1.7x",
        months: [11, 0, 1], // Dec-Feb
    },
    {
        season: "Summer",
        icon: Sun,
        color: "from-orange-400 to-yellow-400",
        medicines: ["ORS", "Electrolytes", "Sunscreen"],
        multiplier: "1.4-2.0x",
        months: [3, 4, 5], // April-June
    },
    {
        season: "Flu Season",
        icon: ThermometerSnowflake,
        color: "from-purple-500 to-pink-500",
        medicines: ["Antivirals", "Vitamin C", "Paracetamol"],
        multiplier: "1.8-2.5x",
        months: [10, 11, 0], // Nov-Jan
    },
];

// Helper to get season status based on current month
function getSeasonStatus(seasonMonths: number[]): "Current" | "Upcoming" | "Past" {
    const currentMonth = new Date().getMonth();

    // Check if current month is in this season
    if (seasonMonths.includes(currentMonth)) {
        return "Current";
    }

    // Check if this season is upcoming (within next 3 months)
    const upcomingMonths = [
        (currentMonth + 1) % 12,
        (currentMonth + 2) % 12,
        (currentMonth + 3) % 12,
    ];

    for (const month of seasonMonths) {
        if (upcomingMonths.includes(month)) {
            return "Upcoming";
        }
    }

    return "Past";
}

// Generate seasonal insights with dynamic status
const seasonalInsights = seasonalPatternsData.map(pattern => ({
    ...pattern,
    status: getSeasonStatus(pattern.months),
}));


const trendConfig = {
    up: { icon: TrendingUp, color: "text-emerald-500", label: "Increasing" },
    down: { icon: TrendingDown, color: "text-red-500", label: "Decreasing" },
    stable: { icon: Minus, color: "text-blue-500", label: "Stable" },
};

// Get seasonal multiplier based on medicine name and current month
function getSeasonalMultiplier(medicineName: string): number {
    const currentMonth = new Date().getMonth();
    const lowerName = medicineName.toLowerCase();

    // Check each season
    for (const season of seasonalInsights) {
        if (season.months.includes(currentMonth)) {
            // Check if medicine matches any seasonal medicine
            for (const med of season.medicines) {
                if (lowerName.includes(med.toLowerCase().split(" ")[0])) {
                    // Return multiplier (average of range)
                    const range = season.multiplier.split("-").map(s => parseFloat(s.replace("x", "")));
                    return (range[0] + range[1]) / 2;
                }
            }
        }
    }
    return 1.0; // Default: no seasonal effect
}

// Generate reason based on trend and seasonal factor
function generateReason(trend: string, seasonalFactor: number, medicineName: string): string {
    if (seasonalFactor > 1.3) {
        return `Seasonal demand increase expected (${seasonalFactor.toFixed(1)}x multiplier)`;
    }
    if (trend === "up") {
        return "Sales trend indicates growing demand";
    }
    if (trend === "down") {
        return "Declining sales trend - consider reducing orders";
    }
    return "Consistent demand pattern observed";
}

export default function ForecastingPage() {
    const [selectedPeriod, setSelectedPeriod] = useState("30");
    const [forecastData, setForecastData] = useState<ForecastItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [aiAnalysisState, setAIAnalysisState] = useState<AIAnalysisState>({});
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Purchase Order states
    const [selectedForPO, setSelectedForPO] = useState<Set<string>>(new Set());
    const [isPODialogOpen, setIsPODialogOpen] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<string>("");
    const [isGeneratingPO, setIsGeneratingPO] = useState(false);

    const supabase = createClient();
    const [userRole, setUserRole] = useState<UserRole | null>(null);

    // Fetch user role
    useEffect(() => {
        async function fetchUserRole() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();
                if (data) setUserRole(data.role as UserRole);
            }
        }
        fetchUserRole();
    }, []);

    // Calculate forecasts from real data
    const calculateForecasts = useCallback(async () => {
        try {
            // 1. Fetch medicines with current stock
            const { data: medicines, error: medError } = await supabase
                .from("medicines")
                .select(`
                    id,
                    name,
                    reorder_level,
                    batches (quantity)
                `);

            if (medError) throw medError;

            // 2. Fetch sales data from last 90 days
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const { data: salesData, error: salesError } = await supabase
                .from("sale_items")
                .select(`
                    quantity,
                    batch_id,
                    batches!inner (
                        medicine_id
                    ),
                    sales!inner (
                        created_at,
                        status
                    )
                `)
                .gte("sales.created_at", ninetyDaysAgo.toISOString())
                .eq("sales.status", "completed");

            if (salesError) throw salesError;

            // 3. Aggregate sales by medicine
            const salesByMedicine: Record<string, number[]> = {};

            salesData?.forEach((item: any) => {
                const medicineId = item.batches?.medicine_id;
                if (medicineId) {
                    if (!salesByMedicine[medicineId]) {
                        salesByMedicine[medicineId] = [];
                    }
                    salesByMedicine[medicineId].push(item.quantity);
                }
            });

            // 4. Calculate forecasts for each medicine
            const periodDays = parseInt(selectedPeriod);
            const forecasts: ForecastItem[] = [];

            medicines?.forEach((med: any) => {
                const currentStock = med.batches?.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0) || 0;
                const salesHistory = salesByMedicine[med.id] || [];
                const totalSales = salesHistory.reduce((sum, qty) => sum + qty, 0);

                // Calculate weekly average (90 days = ~13 weeks)
                const weeksOfData = Math.max(1, 13);
                const avgWeeklySales = totalSales / weeksOfData;

                // Apply seasonal multiplier
                const seasonalFactor = getSeasonalMultiplier(med.name);

                // Calculate forecasted demand for the period
                const weeksInPeriod = periodDays / 7;
                const forecastedDemand = Math.round(avgWeeklySales * weeksInPeriod * seasonalFactor);

                // Calculate reorder quantity - consider BOTH forecasted demand AND reorder level
                const reorderLevel = med.reorder_level || 50;
                const demandBasedReorder = Math.max(0, forecastedDemand - currentStock);
                const levelBasedReorder = currentStock < reorderLevel ? reorderLevel - currentStock : 0;
                // Use the higher of the two (ensures low stock items always show up)
                const reorderQty = Math.max(demandBasedReorder, levelBasedReorder);

                // Determine trend based on recent vs older sales
                let trend: "up" | "down" | "stable" = "stable";
                if (salesHistory.length >= 4) {
                    const recentAvg = salesHistory.slice(-Math.floor(salesHistory.length / 2)).reduce((a, b) => a + b, 0) / (salesHistory.length / 2);
                    const olderAvg = salesHistory.slice(0, Math.floor(salesHistory.length / 2)).reduce((a, b) => a + b, 0) / (salesHistory.length / 2);
                    if (recentAvg > olderAvg * 1.2) trend = "up";
                    else if (recentAvg < olderAvg * 0.8) trend = "down";
                }

                // Calculate confidence based on data availability
                const dataPoints = salesHistory.length;
                const confidence = Math.min(95, Math.max(50, 50 + dataPoints * 3));

                forecasts.push({
                    id: med.id,
                    medicine: med.name,
                    medicineId: med.id,
                    currentStock,
                    forecastedDemand,
                    reorderQty,
                    confidence,
                    trend,
                    seasonalFactor,
                    reason: generateReason(trend, seasonalFactor, med.name),
                    period: `Next ${periodDays} days`,
                    avgWeeklySales,
                    reorderLevel: med.reorder_level || 50,
                    salesHistory: salesHistory, // Store for AI analysis
                });
            });

            // Sort by reorder urgency (highest reorder qty first)
            forecasts.sort((a, b) => b.reorderQty - a.reorderQty);

            setForecastData(forecasts);
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Error calculating forecasts:", error);
            toast.error("Failed to calculate forecasts");
        }
    }, [selectedPeriod, supabase]);

    // Initial load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await calculateForecasts();
            setLoading(false);
        };
        loadData();
    }, [calculateForecasts]);

    // Handle refresh
    const handleRefresh = async () => {
        setRefreshing(true);
        await calculateForecasts();
        setRefreshing(false);
        toast.success("Forecasts updated!");
    };

    // Export to CSV
    const handleExport = () => {
        const headers = ["Medicine", "Current Stock", "Forecasted Demand", "Reorder Qty", "Confidence", "Trend", "Seasonal Factor"];
        const rows = forecastData.map(f => [
            f.medicine,
            f.currentStock,
            f.forecastedDemand,
            f.reorderQty,
            `${f.confidence}%`,
            f.trend,
            f.seasonalFactor.toFixed(2)
        ]);

        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `forecast_${selectedPeriod}days_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        toast.success("Forecast exported!");
    };

    // Get AI analysis for a specific medicine
    const getAIAnalysis = async (forecast: ForecastItem) => {
        // Set loading state
        setAIAnalysisState(prev => ({
            ...prev,
            [forecast.medicineId]: { loading: true }
        }));

        try {
            const response = await fetch("/api/forecast-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    medicineName: forecast.medicine,
                    salesHistory: forecast.salesHistory || [],
                    currentStock: forecast.currentStock,
                    forecastPeriod: parseInt(selectedPeriod),
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                // Update state with AI analysis
                setAIAnalysisState(prev => ({
                    ...prev,
                    [forecast.medicineId]: {
                        loading: false,
                        data: result.data
                    }
                }));
                toast.success("AI analysis complete!");
            } else {
                throw new Error(result.error || "Unknown error");
            }
        } catch (error: any) {
            console.error("AI analysis error:", error);
            setAIAnalysisState(prev => ({
                ...prev,
                [forecast.medicineId]: {
                    loading: false,
                    error: error.message || "Failed to get AI analysis"
                }
            }));
            toast.error(error.message || "Failed to get AI analysis");
        }
    };

    // Fetch suppliers for PO
    const fetchSuppliers = async () => {
        const { data, error } = await supabase
            .from("suppliers")
            .select("id, name, contact_person, email, phone, address")
            .eq("is_active", true)
            .order("name");

        if (data) setSuppliers(data);
    };

    // Toggle selection for PO
    const togglePOSelection = (medicineId: string) => {
        setSelectedForPO(prev => {
            const newSet = new Set(prev);
            if (newSet.has(medicineId)) {
                newSet.delete(medicineId);
            } else {
                newSet.add(medicineId);
            }
            return newSet;
        });
    };

    // Select all medicines needing reorder
    const selectAllForPO = () => {
        const reorderItems = forecastData.filter(f => f.reorderQty > 0);
        if (selectedForPO.size === reorderItems.length) {
            setSelectedForPO(new Set());
        } else {
            setSelectedForPO(new Set(reorderItems.map(f => f.id)));
        }
    };

    // Open PO Dialog
    const openPODialog = () => {
        if (selectedForPO.size === 0) {
            toast.error("Please select at least one medicine");
            return;
        }
        fetchSuppliers();
        setIsPODialogOpen(true);
    };

    // Generate Purchase Order PDF
    const generatePurchaseOrder = () => {
        if (!selectedSupplier) {
            toast.error("Please select a supplier");
            return;
        }

        setIsGeneratingPO(true);
        const supplier = suppliers.find(s => s.id === selectedSupplier);
        const selectedItems = forecastData.filter(f => selectedForPO.has(f.id));

        const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        // Calculate totals (estimate unit price as ₹25)
        const items = selectedItems.map(item => ({
            name: item.medicine,
            qty: item.reorderQty,
            unitPrice: 25,
            total: item.reorderQty * 25
        }));
        const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

        // Generate HTML for PDF
        const itemsHtml = items.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">${item.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.qty}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">₹${item.total.toFixed(2)}</td>
            </tr>
        `).join('');

        const poHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Purchase Order - ${poNumber}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; background: #fff; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #10b981; }
                    .logo { font-size: 28px; font-weight: bold; color: #10b981; }
                    .logo span { color: #3b82f6; }
                    .po-info { text-align: right; }
                    .po-number { font-size: 24px; font-weight: bold; color: #333; }
                    .po-date { color: #666; margin-top: 5px; }
                    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
                    .party { width: 45%; }
                    .party-title { font-weight: bold; color: #10b981; margin-bottom: 10px; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
                    .party-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                    .party-details { color: #666; font-size: 14px; line-height: 1.6; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 12px 10px; text-align: left; font-weight: 600; }
                    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
                    th:last-child { text-align: right; }
                    .total-row { background: #f8f9fa; font-weight: bold; }
                    .total-row td { padding: 15px 10px; border-top: 2px solid #10b981; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 12px; text-align: center; }
                    @media print { body { margin: 0; padding: 20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">Pharma<span>Flow</span></div>
                    <div class="po-info">
                        <div class="po-number">${poNumber}</div>
                        <div class="po-date">Date: ${today}</div>
                    </div>
                </div>
                
                <div class="parties">
                    <div class="party">
                        <div class="party-title">From</div>
                        <div class="party-name">Your Pharmacy</div>
                        <div class="party-details">
                            Smart Pharmacy Inventory<br>
                            PharmaFlow Cloud System
                        </div>
                    </div>
                    <div class="party">
                        <div class="party-title">To (Supplier)</div>
                        <div class="party-name">${supplier?.name || 'N/A'}</div>
                        <div class="party-details">
                            ${supplier?.contact_person ? `Contact: ${supplier.contact_person}<br>` : ''}
                            ${supplier?.email ? `Email: ${supplier.email}<br>` : ''}
                            ${supplier?.phone ? `Phone: ${supplier.phone}<br>` : ''}
                            ${supplier?.address || ''}
                        </div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Medicine Name</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                        <tr class="total-row">
                            <td colspan="3" style="text-align: right; padding-right: 20px;">Grand Total:</td>
                            <td style="text-align: right; font-size: 18px; color: #10b981;">₹${grandTotal.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="footer">
                    <p>This is a computer-generated purchase order from PharmaFlow Smart Pharmacy Inventory System.</p>
                    <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
                </div>

                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;

        // Open in new window for printing/PDF
        const poWindow = window.open('', '_blank', 'width=800,height=900');
        if (poWindow) {
            poWindow.document.write(poHtml);
            poWindow.document.close();
            toast.success(`Purchase Order ${poNumber} generated!`);
        } else {
            toast.error("Please allow popups to generate PO");
        }

        setIsGeneratingPO(false);
        setIsPODialogOpen(false);
        setSelectedForPO(new Set());
        setSelectedSupplier("");
    };

    // Stats
    const totalReorderValue = forecastData.reduce((sum, f) => sum + f.reorderQty * 25, 0);
    const medicinesNeedingReorder = forecastData.filter((f) => f.reorderQty > 0).length;
    const avgConfidence = forecastData.length > 0
        ? Math.round(forecastData.reduce((sum, f) => sum + f.confidence, 0) / forecastData.length)
        : 0;

    // Permission check - only admin and pharmacist can view forecasting
    if (!hasPermission(userRole, "VIEW_FORECASTING")) {
        return (
            <PermissionDenied
                userRole={userRole}
                requiredRoles={["admin", "pharmacist"]}
                feature="view demand forecasting"
            />
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-primary" />
                        <GradientText>Demand Forecasting</GradientText>
                        <Badge className="bg-primary/10 text-primary">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI-Powered
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Intelligent predictions to prevent stockouts and overstocking
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
                            <SelectItem value="7">Next 7 days</SelectItem>
                            <SelectItem value="14">Next 14 days</SelectItem>
                            <SelectItem value="30">Next 30 days</SelectItem>
                            <SelectItem value="90">Next 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="gap-2" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <Button className="gap-2 bg-gradient-to-r from-primary to-pharma-emerald hover:opacity-90" onClick={handleExport} disabled={forecastData.length === 0}>
                        <Download className="w-4 h-4" />
                        Export Report
                    </Button>
                    {selectedForPO.size > 0 && (
                        <Button
                            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90"
                            onClick={openPODialog}
                        >
                            <FileText className="w-4 h-4" />
                            Create PO ({selectedForPO.size})
                        </Button>
                    )}
                </motion.div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Medicines Analyzed", value: forecastData.length, icon: Package, color: "from-blue-500 to-cyan-500" },
                    { label: "Need Reorder", value: medicinesNeedingReorder, icon: AlertTriangle, color: "from-amber-500 to-orange-500" },
                    { label: "Avg Confidence", value: `${avgConfidence}%`, icon: Target, color: "from-emerald-500 to-teal-500" },
                    { label: "Est. Reorder Value", value: `₹${(totalReorderValue / 1000).toFixed(1)}K`, icon: Zap, color: "from-purple-500 to-violet-500" },
                ].map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="glass-card border-white/10">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                    <stat.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                    <p className="text-xl font-bold">{stat.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Forecast List */}
                <div className="lg:col-span-2 space-y-4">
                    <Tabs defaultValue="all" className="space-y-4">
                        <TabsList className="bg-accent/50">
                            <TabsTrigger value="all">All Medicines ({forecastData.length})</TabsTrigger>
                            <TabsTrigger value="reorder">Needs Reorder ({medicinesNeedingReorder})</TabsTrigger>
                            <TabsTrigger value="increasing">High Demand ({forecastData.filter(f => f.trend === "up").length})</TabsTrigger>
                        </TabsList>

                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <Card key={i} className="glass-card border-white/10">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-4">
                                                <Skeleton className="w-12 h-12 rounded-xl" />
                                                <div className="flex-1 space-y-3">
                                                    <Skeleton className="h-6 w-1/3" />
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <Skeleton className="h-12 w-full" />
                                                        <Skeleton className="h-12 w-full" />
                                                        <Skeleton className="h-12 w-full" />
                                                    </div>
                                                    <Skeleton className="h-2 w-full" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : forecastData.length === 0 ? (
                            <Card className="glass-card border-white/10">
                                <CardContent className="p-12 text-center">
                                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No forecast data available</h3>
                                    <p className="text-muted-foreground">Add medicines and record sales to see demand predictions.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <TabsContent value="all" className="space-y-3 mt-0">
                                    {forecastData.map((forecast, index) => (
                                        <ForecastCard
                                            key={forecast.id}
                                            forecast={forecast}
                                            index={index}
                                            aiState={aiAnalysisState[forecast.medicineId]}
                                            onGetAIAnalysis={() => getAIAnalysis(forecast)}
                                        />
                                    ))}
                                </TabsContent>

                                <TabsContent value="reorder" className="space-y-3 mt-0">
                                    {forecastData.filter((f) => f.reorderQty > 0).length === 0 ? (
                                        <Card className="glass-card border-white/10">
                                            <CardContent className="p-8 text-center">
                                                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                                                <p className="text-muted-foreground">All stock levels are healthy!</p>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <>
                                            {/* Select All for PO */}
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border/50">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        id="select-all-po"
                                                        checked={selectedForPO.size === forecastData.filter(f => f.reorderQty > 0).length && selectedForPO.size > 0}
                                                        onCheckedChange={selectAllForPO}
                                                    />
                                                    <label htmlFor="select-all-po" className="text-sm font-medium cursor-pointer">
                                                        Select all for Purchase Order
                                                    </label>
                                                </div>
                                                {selectedForPO.size > 0 && (
                                                    <Badge variant="secondary" className="gap-1">
                                                        <Truck className="w-3 h-3" />
                                                        {selectedForPO.size} selected
                                                    </Badge>
                                                )}
                                            </div>

                                            {forecastData.filter((f) => f.reorderQty > 0).map((forecast, index) => (
                                                <div key={forecast.id} className="flex items-start gap-3">
                                                    <div className="pt-5">
                                                        <Checkbox
                                                            checked={selectedForPO.has(forecast.id)}
                                                            onCheckedChange={() => togglePOSelection(forecast.id)}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <ForecastCard
                                                            forecast={forecast}
                                                            index={index}
                                                            aiState={aiAnalysisState[forecast.medicineId]}
                                                            onGetAIAnalysis={() => getAIAnalysis(forecast)}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </TabsContent>

                                <TabsContent value="increasing" className="space-y-3 mt-0">
                                    {forecastData.filter((f) => f.trend === "up").length === 0 ? (
                                        <Card className="glass-card border-white/10">
                                            <CardContent className="p-8 text-center">
                                                <Minus className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                                                <p className="text-muted-foreground">No medicines showing increasing demand.</p>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        forecastData.filter((f) => f.trend === "up").map((forecast, index) => (
                                            <ForecastCard
                                                key={forecast.id}
                                                forecast={forecast}
                                                index={index}
                                                aiState={aiAnalysisState[forecast.medicineId]}
                                                onGetAIAnalysis={() => getAIAnalysis(forecast)}
                                            />
                                        ))
                                    )}
                                </TabsContent>
                            </>
                        )}
                    </Tabs>
                </div>

                {/* Seasonal Insights */}
                <div className="space-y-4">
                    <RevealOnScroll direction="right">
                        <Card className="glass-card border-white/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-primary" />
                                    Seasonal Patterns
                                </CardTitle>
                                <CardDescription>
                                    Demand multipliers by season
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {seasonalInsights.map((season, index) => (
                                    <motion.div
                                        key={season.season}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`p-4 rounded-xl bg-gradient-to-r ${season.color} bg-opacity-10 border border-white/10`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${season.color} flex items-center justify-center`}>
                                                    <season.icon className="w-4 h-4 text-white" />
                                                </div>
                                                <span className="font-semibold">{season.season}</span>
                                            </div>
                                            <Badge
                                                variant={season.status === "Current" ? "default" : "secondary"}
                                                className={season.status === "Current" ? "bg-emerald-500 animate-pulse" : ""}
                                            >
                                                {season.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Demand multiplier: <span className="font-semibold text-foreground">{season.multiplier}</span>
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {season.medicines.slice(0, 3).map((med) => (
                                                <Badge key={med} variant="outline" className="text-xs">
                                                    {med}
                                                </Badge>
                                            ))}
                                            {season.medicines.length > 3 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{season.medicines.length - 3}
                                                </Badge>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </CardContent>
                        </Card>
                    </RevealOnScroll>

                    {/* Forecast Method */}
                    <RevealOnScroll direction="right">
                        <Card className="glass-card border-white/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                    Forecast Method
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="p-3 rounded-lg bg-accent/50">
                                    <p className="text-sm font-medium mb-1">Moving Average + Seasonal</p>
                                    <p className="text-xs text-muted-foreground">
                                        Combines 12-week moving average with seasonal multipliers for accurate predictions
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Historical Data</span>
                                        <span>90 days (3 months)</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Seasonal Factors</span>
                                        <span>{seasonalInsights.filter(s => s.status === "Current").length > 0 ? seasonalInsights.filter(s => s.status === "Current").map(s => s.season).join(", ") : "None active"}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Last Updated</span>
                                        <span>{lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--"}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </RevealOnScroll>
                </div>
            </div>

            {/* Purchase Order Dialog */}
            <Dialog open={isPODialogOpen} onOpenChange={setIsPODialogOpen}>
                <DialogContent className="max-w-lg glass-card">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Create Purchase Order
                        </DialogTitle>
                        <DialogDescription>
                            Generate a purchase order for {selectedForPO.size} selected medicine{selectedForPO.size !== 1 ? 's' : ''}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Selected Items Summary */}
                        <div className="p-3 rounded-lg bg-accent/30 border border-border/50">
                            <p className="text-sm font-medium mb-2">Selected Items:</p>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                {forecastData.filter(f => selectedForPO.has(f.id)).map(item => (
                                    <Badge key={item.id} variant="outline" className="text-xs">
                                        {item.medicine} ({item.reorderQty} units)
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Supplier Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Supplier</label>
                            <SelectUI value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                <SelectTriggerUI className="bg-background/50">
                                    <Truck className="w-4 h-4 mr-2 text-muted-foreground" />
                                    <SelectValueUI placeholder="Choose a supplier..." />
                                </SelectTriggerUI>
                                <SelectContentUI>
                                    {suppliers.length === 0 ? (
                                        <SelectItemUI value="_none" disabled>No suppliers available</SelectItemUI>
                                    ) : (
                                        suppliers.map(supplier => (
                                            <SelectItemUI key={supplier.id} value={supplier.id}>
                                                {supplier.name}
                                            </SelectItemUI>
                                        ))
                                    )}
                                </SelectContentUI>
                            </SelectUI>
                        </div>

                        {/* Estimated Total */}
                        <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Estimated Total:</span>
                                <span className="text-xl font-bold text-emerald-500">
                                    ₹{(forecastData.filter(f => selectedForPO.has(f.id)).reduce((sum, f) => sum + f.reorderQty * 25, 0)).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">*Based on average cost of ₹25/unit</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setIsPODialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90"
                            onClick={generatePurchaseOrder}
                            disabled={!selectedSupplier || isGeneratingPO}
                        >
                            {isGeneratingPO ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Generate PO
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ForecastCard({
    forecast,
    index,
    aiState,
    onGetAIAnalysis
}: {
    forecast: ForecastItem;
    index: number;
    aiState?: AIAnalysisState[string];
    onGetAIAnalysis: () => void;
}) {
    const [showAIReasoning, setShowAIReasoning] = useState(false);
    const trend = trendConfig[forecast.trend as keyof typeof trendConfig];
    const TrendIcon = trend.icon;
    const stockCoverage = Math.min(100, (forecast.currentStock / forecast.forecastedDemand) * 100);
    const needsReorder = forecast.reorderQty > 0;

    // Use AI data if available, otherwise use rule-based
    const displayForecast = aiState?.data ? {
        ...forecast,
        forecastedDemand: aiState.data.forecastedDemand,
        confidence: aiState.data.confidence,
        trend: aiState.data.trend,
        seasonalFactor: aiState.data.seasonalFactor
    } : forecast;
    const hasAIAnalysis = !!aiState?.data;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <TiltCard>
                <Card className={`glass-card border-white/10 hover:border-primary/30 transition-all ${needsReorder ? "border-l-4 border-l-amber-500" : ""
                    }`}>
                    <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${needsReorder
                                ? "bg-gradient-to-br from-amber-500 to-orange-500"
                                : "bg-gradient-to-br from-emerald-500 to-teal-500"
                                }`}>
                                {needsReorder ? (
                                    <AlertTriangle className="w-6 h-6 text-white" />
                                ) : (
                                    <CheckCircle className="w-6 h-6 text-white" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="font-semibold flex items-center gap-2">
                                            {forecast.medicine}
                                            {hasAIAnalysis && (
                                                <Badge className="bg-primary/10 text-primary text-xs">
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    AI
                                                </Badge>
                                            )}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">{forecast.period}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={`${trend.color} bg-current/10`}>
                                            <TrendIcon className="w-3 h-3 mr-1" />
                                            {trend.label}
                                        </Badge>
                                        <Badge variant="outline" className="font-mono">
                                            {displayForecast.confidence}% conf
                                        </Badge>
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-3 gap-4 py-2">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Current Stock</p>
                                        <p className="text-lg font-bold">{forecast.currentStock}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Forecasted Demand</p>
                                        <p className="text-lg font-bold flex items-center gap-1">
                                            {displayForecast.forecastedDemand}
                                            {displayForecast.seasonalFactor > 1 && (
                                                <span className="text-xs text-primary">({displayForecast.seasonalFactor}x)</span>
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Recommended Order</p>
                                        <p className={`text-lg font-bold ${needsReorder ? "text-amber-500" : "text-emerald-500"}`}>
                                            {needsReorder ? forecast.reorderQty : "No need"}
                                        </p>
                                    </div>
                                </div>

                                {/* Stock Coverage Bar */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Stock Coverage</span>
                                        <span className={stockCoverage < 50 ? "text-amber-500" : "text-emerald-500"}>
                                            {Math.round(stockCoverage)}%
                                        </span>
                                    </div>
                                    <Progress
                                        value={stockCoverage}
                                        className={`h-2 ${stockCoverage < 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"}`}
                                    />
                                </div>

                                {/* Reason */}
                                <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-primary" />
                                    {forecast.reason}
                                </p>

                                {/* AI Reasoning (if available) */}
                                {hasAIAnalysis && aiState?.data && (
                                    <div className="space-y-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                                            onClick={() => setShowAIReasoning(!showAIReasoning)}
                                        >
                                            {showAIReasoning ? "Hide" : "Show"} AI Analysis
                                            <motion.span
                                                animate={{ rotate: showAIReasoning ? 180 : 0 }}
                                                className="ml-1"
                                            >
                                                ▼
                                            </motion.span>
                                        </Button>

                                        <AnimatePresence>
                                            {showAIReasoning && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                                        <p className="text-xs font-medium text-primary mb-1">AI Insight:</p>
                                                        <p className="text-xs text-muted-foreground">{aiState.data.reasoning}</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                    {!hasAIAnalysis && !aiState?.loading && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-2"
                                            onClick={onGetAIAnalysis}
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            Get AIInsight
                                        </Button>
                                    )}

                                    {aiState?.loading && (
                                        <Button size="sm" variant="outline" disabled>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Analyzing...
                                        </Button>
                                    )}

                                    {needsReorder && (
                                        <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">
                                            <Package className="w-3 h-3 mr-1" />
                                            Needs Reorder
                                        </Badge>
                                    )}
                                </div>

                                {/* Error State */}
                                {aiState?.error && (
                                    <p className="text-xs text-red-500 italic">{aiState.error}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TiltCard>
        </motion.div>
    );
}
