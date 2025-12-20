"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GradientText, RevealOnScroll, TiltCard } from "@/components/ui/animated";
import {
    ShoppingCart,
    Search,
    Plus,
    Minus,
    Trash2,
    Pencil, // Added Pencil
    CreditCard,
    Wallet,
    Smartphone,
    DollarSign,
    User,
    Phone,
    Mail, // Added Mail
    Receipt,
    CheckCircle,
    XCircle, // Added XCircle
    Package,
    Clock,
    TrendingUp,
    ArrowRight,
    Printer,
    X,
    AlertCircle,
} from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { toast } from "sonner";

interface Medicine {
    id: string;
    name: string;
    batches: Batch[];
}

interface Batch {
    id: string;
    batch_number: string;
    quantity: number;
    expiry_date: string;
    selling_price: number;
    cost_price: number;
}

interface CartItem {
    id: string;           // medicine_id
    batchId: string;      // batch_id for stock deduction
    name: string;
    price: number;
    quantity: number;
    batch: string;
    expiry: string;
    availableStock: number;
    usage_instructions?: string;
}

interface Sale {
    id: string;
    customer_name: string | null;
    customer_phone: string | null;
    total: number;
    created_at: string;
    status: string;
    payment_method: string;
    sale_items: {
        quantity: number;
        batch_id: string;
        unit_price: number;
        medicines: { name: string } | null;
    }[];
}

export default function SalesPage() {
    const supabase = useSupabase();
    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [discount, setDiscount] = useState(0);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [editCustomerName, setEditCustomerName] = useState("");
    const [editCustomerPhone, setEditCustomerPhone] = useState("");
    const [editPaymentMethod, setEditPaymentMethod] = useState("cash");
    const [editItems, setEditItems] = useState<{ id: string; quantity: number; originalQuantity: number }[]>([]);
    const [lastInvoiceId, setLastInvoiceId] = useState("");
    const [lastSaleDetails, setLastSaleDetails] = useState<{
        invoiceId: string;
        items: CartItem[];
        customerName: string;
        customerPhone: string;
        paymentMethod: string;
        subtotal: number;
        discount: number;
        total: number;
        date: string;
    } | null>(null);

    // Real-time data from Supabase
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [recentSales, setRecentSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Print receipt function
    const handlePrint = () => {
        window.print();
    };

    // Fetch medicines with batches (FEFO sorted)
    const fetchInventory = async () => {
        try {
            const { data, error } = await supabase
                .from("medicines")
                .select(`
                    id,
                    name,
                    batches (
                        id,
                        batch_number,
                        quantity,
                        expiry_date,
                        selling_price,
                        cost_price
                    )
                `)
                .order("name");

            if (error) throw error;

            // Filter and sort batches by FEFO (First Expiry First Out)
            const processedMedicines = (data || []).map((med: any) => ({
                ...med,
                batches: (med.batches || [])
                    .filter((b: Batch) => {
                        // Filter out expired batches and zero stock
                        const isExpired = new Date(b.expiry_date) < new Date();
                        return !isExpired && b.quantity > 0;
                    })
                    .sort((a: Batch, b: Batch) =>
                        new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
                    )
            })).filter((med: Medicine) => med.batches.length > 0); // Only show medicines with available stock

            setMedicines(processedMedicines);
        } catch (error) {
            console.error("Error fetching inventory:", error);
            toast.error("Failed to load inventory");
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch recent sales
    const fetchRecentSales = async () => {
        try {
            const { data, error } = await supabase
                .from("sales")
                .select(`
                    id,
                    customer_name,
                    customer_phone,
                    total,
                    created_at,
                    status,
                    payment_method,
                    sale_items (
                        quantity,
                        batch_id,
                        unit_price,
                        medicines (name)
                    )
                `)
                .order("created_at", { ascending: false })
                .limit(10);

            if (error) throw error;
            setRecentSales((data as unknown as Sale[]) || []);
        } catch (error) {
            console.error("Error fetching sales:", error);
        }
    };

    // Initial load
    useEffect(() => {
        fetchInventory();
        fetchRecentSales();
    }, []);

    // Real-time subscription for inventory updates
    useEffect(() => {
        const channel = supabase
            .channel("inventory-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "batches" },
                () => {
                    fetchInventory();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "medicines" },
                () => {
                    fetchInventory();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Real-time subscription for sales updates
    useEffect(() => {
        const channel = supabase
            .channel("sales-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "sales" },
                () => {
                    fetchRecentSales();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "sale_items" },
                () => {
                    fetchRecentSales();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Refresh sales when edit dialog closes to ensure UI consistency
    useEffect(() => {
        if (!isEditDialogOpen && editingSale !== null) {
            // Dialog just closed after editing, force refresh
            fetchRecentSales();
        }
    }, [isEditDialogOpen]);

    // Filter medicines based on search
    const filteredMedicines = medicines.filter(
        (med) =>
            med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            med.batches.some(b => b.batch_number.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Cart calculations
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = (subtotal * discount) / 100;
    const tax = (subtotal - discountAmount) * 0.05; // 5% GST
    const total = subtotal - discountAmount + tax;

    const addToCart = (medicine: Medicine) => {
        // Get FEFO batch (first in sorted array)
        const batch = medicine.batches[0];
        if (!batch) {
            toast.error("No available stock");
            return;
        }

        const existing = cart.find((item) => item.batchId === batch.id);

        if (existing) {
            // Check stock availability
            if (existing.quantity >= batch.quantity) {
                toast.error(`Only ${batch.quantity} units available`);
                return;
            }
            setCart(
                cart.map((item) =>
                    item.batchId === batch.id ? { ...item, quantity: item.quantity + 1 } : item
                )
            );
        } else {
            setCart([
                ...cart,
                {
                    id: medicine.id,
                    batchId: batch.id,
                    name: medicine.name,
                    price: batch.selling_price,
                    quantity: 1,
                    batch: batch.batch_number,
                    expiry: batch.expiry_date,
                    availableStock: batch.quantity,
                    usage_instructions: "",
                },
            ]);
        }
        toast.success(`Added ${medicine.name} to cart`);
    };

    const updateQuantity = (batchId: string, delta: number) => {
        setCart(
            cart
                .map((item) => {
                    if (item.batchId === batchId) {
                        const newQuantity = item.quantity + delta;
                        // Validate stock
                        if (newQuantity > item.availableStock) {
                            toast.error(`Only ${item.availableStock} units available`);
                            return item;
                        }
                        return { ...item, quantity: Math.max(0, newQuantity) };
                    }
                    return item;
                })
                .filter((item) => item.quantity > 0)
        );
    };

    const removeFromCart = (batchId: string) => {
        setCart(cart.filter((item) => item.batchId !== batchId));
    };

    const clearCart = () => {
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerEmail("");
        setDiscount(0);
    };

    const handleDeleteSale = async (sale: Sale) => {
        if (!confirm(`Delete sale ${sale.id.slice(0, 13)}? This will restore stock quantities.`)) {
            return;
        }

        try {


            // STEP 1: Restore stock quantities FIRST (using sale_items data from UI)

            for (const item of sale.sale_items) {
                const { data: batch } = await supabase
                    .from("batches")
                    .select("quantity")
                    .eq("id", item.batch_id)
                    .maybeSingle();

                if (batch) {
                    const newQuantity = batch.quantity + item.quantity;


                    await supabase
                        .from("batches")
                        .update({ quantity: newQuantity } as any)
                        .eq("id", item.batch_id);
                }
            }

            // STEP 2: Delete stock movements (if they exist)

            await supabase
                .from("stock_movements")
                .delete()
                .eq("reference_id", sale.id);

            // STEP 3: Delete the sale (CASCADE will delete sale_items automatically)

            const { error: saleError } = await supabase
                .from("sales")
                .delete()
                .eq("id", sale.id);

            if (saleError) {
                console.error("Error deleting sale:", saleError);
                throw saleError;
            }


            toast.success("Sale deleted and stock restored");

            // STEP 4: Update UI immediately
            setRecentSales(prevSales => prevSales.filter(s => s.id !== sale.id));

            // STEP 5: Refresh from database
            await fetchRecentSales();
            await fetchInventory();

        } catch (error) {
            console.error("Error deleting sale:", error);
            toast.error("Failed to delete sale");
            await fetchRecentSales();
        }
    };

    const handleEditSale = (sale: Sale) => {
        setEditingSale(sale);
        setEditCustomerName(sale.customer_name || "");
        setEditCustomerPhone(sale.customer_phone || "");
        setEditPaymentMethod(sale.payment_method);
        setEditItems(sale.sale_items.map(item => ({
            id: item.batch_id,
            quantity: item.quantity,
            originalQuantity: item.quantity
        })));
        setIsEditDialogOpen(true);
    };

    const handleUpdateSale = async () => {
        if (!editingSale) return;

        try {


            // 1. Adjust stock for quantity changes
            for (const editItem of editItems) {
                const originalItem = editingSale.sale_items.find(si => si.batch_id === editItem.id);
                if (!originalItem) continue;

                const quantityDiff = editItem.quantity - editItem.originalQuantity;
                if (quantityDiff !== 0) {
                    const { data: batch } = await supabase
                        .from("batches")
                        .select("quantity")
                        .eq("id", editItem.id)
                        .maybeSingle();

                    if (batch) {
                        // If quantity increased, reduce stock more
                        // If quantity decreased, restore stock
                        const newQuantity = batch.quantity - quantityDiff;


                        await supabase
                            .from("batches")
                            .update({ quantity: newQuantity })
                            .eq("id", editItem.id);
                    }
                }

                // Update sale_item quantity
                await supabase
                    .from("sale_items")
                    .update({ quantity: editItem.quantity })
                    .eq("sale_id", editingSale.id)
                    .eq("batch_id", editItem.id);
            }

            // 2. Recalculate total
            const newTotal = editItems.reduce((sum, item) => {
                const saleItem = editingSale.sale_items.find(si => si.batch_id === item.id);
                return sum + (saleItem ? saleItem.unit_price * item.quantity : 0);
            }, 0);

            // 3. Update sale record
            await supabase
                .from("sales")
                .update({
                    customer_name: editCustomerName || null,
                    customer_phone: editCustomerPhone || null,
                    payment_method: editPaymentMethod,
                    total: newTotal,
                    subtotal: newTotal
                })
                .eq("id", editingSale.id);


            toast.success("Sale updated successfully");

            // Refresh data first
            await fetchRecentSales();
            await fetchInventory();

            // Small delay to ensure UI updates before closing dialog
            await new Promise(resolve => setTimeout(resolve, 300));

            setIsEditDialogOpen(false);
            setEditingSale(null);

        } catch (error) {
            console.error("Error updating sale:", error);
            toast.error("Failed to update sale");
        }
    };

    const handleCancelEdit = () => {
        setIsEditDialogOpen(false);
        setEditingSale(null);
        setEditCustomerName("");
        setEditCustomerPhone("");
        setEditPaymentMethod("cash");
        setEditItems([]);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error("Cart is empty");
            return;
        }

        setIsCheckoutOpen(false);

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Please log in to complete sale");
                return;
            }

            // 1. Create sale record
            const { data: sale, error: saleError } = await supabase
                .from("sales")
                .insert({
                    customer_name: customerName || "Walk-in",
                    customer_phone: customerPhone || null,
                    customer_email: customerEmail || null,
                    payment_method: paymentMethod,
                    subtotal: subtotal,
                    discount: discountAmount,
                    tax: tax,
                    total: total,
                    status: "completed",
                    created_by: user.id,
                } as any)
                .select()
                .single() as any;

            if (saleError) throw saleError;

            // 2. Create sale items and update stock
            for (const item of cart) {
                // Create sale item
                const { error: itemError } = await supabase
                    .from("sale_items")
                    .insert({
                        sale_id: sale.id,
                        medicine_id: item.id,
                        batch_id: item.batchId,
                        quantity: item.quantity,
                        unit_price: item.price,
                        total: item.price * item.quantity,
                        usage_instructions: item.usage_instructions || null,
                    } as any) as any;

                if (itemError) throw itemError;

                // Update batch quantity
                const { error: batchError } = await supabase
                    .from("batches")
                    .update({
                        quantity: item.availableStock - item.quantity,
                    })
                    .eq("id", item.batchId) as any;

                if (batchError) throw batchError;

                // Create stock movement for audit
                await supabase.from("stock_movements").insert({
                    medicine_id: item.id,
                    batch_id: item.batchId,
                    movement_type: "sale",
                    quantity: -item.quantity,
                    reference_id: sale.id,
                } as any) as any;
            }

            setLastInvoiceId(sale.id);

            // Store sale details for receipt
            setLastSaleDetails({
                invoiceId: sale.id,
                items: [...cart],
                customerName: customerName || "Walk-in Customer",
                customerPhone: customerPhone || "N/A",
                paymentMethod,
                subtotal,
                discount,
                total,
                date: new Date().toISOString(),
            });

            setIsSuccessOpen(true);
            toast.success("Sale completed successfully!");

            // Send Email Receipt
            if (customerEmail) {
                fetch("/api/send-receipt", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        saleId: sale.id,
                        email: customerEmail,
                    }),
                }).then((res) => {
                    if (res.ok) toast.success("Receipt emailed to customer");
                    else toast.error("Failed to email receipt");
                });
            }

            // Refresh data
            fetchInventory();
            fetchRecentSales();

            setTimeout(() => {
                setIsSuccessOpen(false);
                clearCart();
            }, 3000);
        } catch (error) {
            console.error("Checkout error:", error);
            toast.error("Failed to complete sale. Please try again.");
        }
    };

    // Calculate today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = recentSales
        .filter((s) => new Date(s.created_at) >= today && s.status === "completed")
        .reduce((sum, s) => sum + s.total, 0);
    const todayTransactions = recentSales.filter(
        (s) => new Date(s.created_at) >= today && s.status === "completed"
    ).length;
    const totalItemsSold = recentSales
        .filter((s) => new Date(s.created_at) >= today)
        .reduce((sum, s) => sum + s.sale_items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

    // Format relative time
    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <ShoppingCart className="w-8 h-8 text-primary" />
                        <GradientText>Point of Sale</GradientText>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Process sales with FEFO batch selection
                    </p>
                </motion.div>

                <motion.div
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Button variant="outline" className="gap-2" onClick={() => setIsHistoryOpen(true)}>
                        <Receipt className="w-4 h-4" />
                        View History
                    </Button>
                </motion.div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Today's Sales", value: `₹${todaySales.toLocaleString()}`, icon: DollarSign, color: "from-emerald-500 to-teal-500" },
                    { label: "Transactions", value: todayTransactions, icon: ShoppingCart, color: "from-blue-500 to-cyan-500" },
                    { label: "Avg. Order", value: todayTransactions > 0 ? `₹${Math.round(todaySales / todayTransactions)}` : "₹0", icon: TrendingUp, color: "from-purple-500 to-violet-500" },
                    { label: "Items Sold", value: totalItemsSold, icon: Package, color: "from-amber-500 to-orange-500" },
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

            {/* Main POS Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product Selection */}
                <div className="lg:col-span-2 space-y-4">
                    <RevealOnScroll>
                        <Card className="glass-card border-white/10">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Select Products</CardTitle>
                                    <div className="relative w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search medicine or batch..."
                                            className="pl-10 bg-background/50"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Package className="w-10 h-10 mx-auto mb-2 opacity-50 animate-pulse" />
                                        <p>Loading inventory...</p>
                                    </div>
                                ) : filteredMedicines.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p>No medicines found</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        <AnimatePresence mode="popLayout">
                                            {filteredMedicines.map((medicine, index) => {
                                                const batch = medicine.batches[0]; // FEFO batch
                                                return (
                                                    <motion.div
                                                        key={medicine.id}
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        transition={{ duration: 0.15, delay: index * 0.02 }}
                                                        layout
                                                    >
                                                        <motion.button
                                                            className="w-full p-3 rounded-xl bg-accent/50 hover:bg-accent border border-transparent hover:border-primary/30 transition-all text-left group"
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => addToCart(medicine)}
                                                        >
                                                            <div className="flex items-start justify-between mb-2">
                                                                <Badge variant="outline" className="text-xs font-mono">
                                                                    {batch.batch_number}
                                                                </Badge>
                                                                {batch.quantity < 50 && (
                                                                    <Badge className="bg-amber-500/10 text-amber-500 text-xs">
                                                                        Low
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                                                {medicine.name}
                                                            </p>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-lg font-bold text-emerald-500">
                                                                    ₹{batch.selling_price}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {batch.quantity} left
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                                                <Clock className="w-3 h-3" />
                                                                Exp: {new Date(batch.expiry_date).toLocaleDateString()}
                                                            </div>
                                                        </motion.button>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </RevealOnScroll>

                    {/* Recent Sales */}
                    <RevealOnScroll>
                        <Card className="glass-card border-white/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-primary" />
                                    Recent Sales
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {recentSales.slice(0, 4).map((sale, index) => {
                                        const itemCount = sale.sale_items.reduce((sum, item) => sum + item.quantity, 0);
                                        // Create medicine summary: "Paracetamol (2), Aspirin (1)"
                                        const medicineSummary = sale.sale_items
                                            .map(item => `${item.medicines?.name || 'Unknown'} (${item.quantity})`)
                                            .join(", ");
                                        return (
                                            <motion.div
                                                key={sale.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                            <Receipt className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">{sale.id.slice(0, 8)}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {sale.customer_name || "Walk-in"} • {sale.payment_method.toUpperCase()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-emerald-500">₹{sale.total.toFixed(2)}</p>
                                                        <p className="text-xs text-muted-foreground">{getRelativeTime(sale.created_at)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground pl-11">
                                                    {medicineSummary}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </RevealOnScroll>
                </div>

                {/* Cart */}
                <div className="space-y-4">
                    <TiltCard>
                        <Card className="glass-card border-white/10 sticky top-6">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5" />
                                        Cart ({cart.length})
                                    </CardTitle>
                                    {cart.length > 0 && (
                                        <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 hover:text-red-600">
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Clear
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Customer Info */}
                                <div className="space-y-3">
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Customer Name (optional)"
                                            className="pl-10 bg-background/50"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Phone (optional)"
                                            className="pl-10 bg-background/50"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Email (for receipt)"
                                            className="pl-10 bg-background/50"
                                            value={customerEmail}
                                            onChange={(e) => setCustomerEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* Cart Items */}
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    <AnimatePresence mode="popLayout">
                                        {cart.length === 0 ? (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-center py-8 text-muted-foreground"
                                            >
                                                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">Cart is empty</p>
                                                <p className="text-xs">Click on products to add</p>
                                            </motion.div>
                                        ) : (
                                            cart.map((item, index) => (
                                                <motion.div
                                                    key={item.batchId}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    transition={{ duration: 0.15, delay: index * 0.02 }}
                                                    layout
                                                    className="flex flex-col gap-2 p-2 rounded-lg bg-accent/30"
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex-1 min-w-0 mr-2">
                                                            <p className="font-medium text-sm truncate">{item.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                ₹{item.price} × {item.quantity}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7"
                                                                onClick={() => updateQuantity(item.batchId, -1)}
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </Button>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => {
                                                                    const value = parseInt(e.target.value) || 1;
                                                                    const newQuantity = Math.max(1, value);
                                                                    setCart(cart.map(cartItem =>
                                                                        cartItem.batchId === item.batchId
                                                                            ? { ...cartItem, quantity: newQuantity }
                                                                            : cartItem
                                                                    ));
                                                                }}
                                                                className="w-12 h-7 text-center text-sm font-medium p-0"
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7"
                                                                onClick={() => updateQuantity(item.batchId, 1)}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-red-500"
                                                                onClick={() => removeFromCart(item.batchId)}
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="w-full space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Usage Instructions</Label>
                                                        <Input
                                                            placeholder="e.g. 5ml after food"
                                                            className="h-8 text-xs bg-background/50 border-primary/10"
                                                            value={item.usage_instructions || ""}
                                                            onChange={(e) => {
                                                                setCart(cart.map(cartItem =>
                                                                    cartItem.batchId === item.batchId
                                                                        ? { ...cartItem, usage_instructions: e.target.value }
                                                                        : cartItem
                                                                ));
                                                            }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </div>

                                <Separator />

                                {/* Discount */}
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm text-muted-foreground">Discount %</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={discount}
                                        onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                                        className="w-20 bg-background/50"
                                    />
                                </div>

                                {/* Totals */}
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>₹{subtotal.toFixed(2)}</span>
                                    </div>
                                    {discount > 0 && (
                                        <div className="flex justify-between text-emerald-500">
                                            <span>Discount ({discount}%)</span>
                                            <span>-₹{discountAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">GST (5%)</span>
                                        <span>₹{tax.toFixed(2)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>Total</span>
                                        <span className="text-primary">₹{total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Checkout Button */}
                                <Button
                                    className="w-full h-12 text-lg bg-gradient-to-r from-primary to-pharma-emerald hover:opacity-90"
                                    disabled={cart.length === 0}
                                    onClick={() => setIsCheckoutOpen(true)}
                                >
                                    <CreditCard className="w-5 h-5 mr-2" />
                                    Checkout
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </TiltCard>
                </div>
            </div>

            {/* Checkout Dialog */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-[400px] glass-card">
                    <DialogHeader>
                        <DialogTitle>Complete Payment</DialogTitle>
                        <DialogDescription>
                            Total: ₹{total.toFixed(2)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Label>Payment Method</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: "cash", icon: Wallet, label: "Cash" },
                                { value: "card", icon: CreditCard, label: "Card" },
                                { value: "upi", icon: Smartphone, label: "UPI" },
                            ].map((method) => (
                                <motion.button
                                    key={method.value}
                                    className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === method.value
                                        ? "border-primary bg-primary/10"
                                        : "border-border hover:border-primary/50"
                                        }`}
                                    onClick={() => setPaymentMethod(method.value)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <method.icon className={`w-6 h-6 mx-auto mb-2 ${paymentMethod === method.value ? "text-primary" : "text-muted-foreground"
                                        }`} />
                                    <p className="text-sm font-medium">{method.label}</p>
                                </motion.button>
                            ))}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="outline" className="flex-1" onClick={() => setIsCheckoutOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-gradient-to-r from-primary to-pharma-emerald"
                                onClick={handleCheckout}
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Confirm
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sales History Dialog */}
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <DialogContent className="max-w-7xl max-h-[90vh] glass-card">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            <Receipt className="w-6 h-6 text-primary" />
                            Sales History
                        </DialogTitle>
                        <DialogDescription>
                            Complete transaction history with detailed breakdown
                        </DialogDescription>
                    </DialogHeader>
                    <div className="overflow-y-auto max-h-[70vh] pr-2">
                        {recentSales.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">
                                <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">No sales recorded yet</p>
                                <p className="text-sm">Start selling to see transaction history</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentSales.map((sale, index) => {
                                    const itemCount = sale.sale_items.reduce((sum, item) => sum + item.quantity, 0);
                                    return (
                                        <motion.div
                                            key={sale.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="p-5 rounded-xl bg-accent/30 hover:bg-accent/50 border border-border/50 transition-all"
                                        >
                                            {/* Header Row */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-pharma-emerald/20 flex items-center justify-center">
                                                        <Receipt className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-mono text-base font-semibold mb-1">
                                                            {sale.id.slice(0, 18)}
                                                        </p>
                                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                            <div className="flex items-center gap-1">
                                                                <User className="w-3.5 h-3.5" />
                                                                <span>{sale.customer_name || "Walk-in"}</span>
                                                            </div>
                                                            <span>•</span>
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                <span>
                                                                    {new Date(sale.created_at).toLocaleDateString('en-IN', {
                                                                        day: '2-digit',
                                                                        month: 'short',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <div className="text-right">
                                                        <p className="text-2xl font-bold text-emerald-500 mb-1">
                                                            ₹{sale.total.toFixed(2)}
                                                        </p>
                                                        <Badge variant="outline" className="text-xs">
                                                            {sale.payment_method.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                                            onClick={() => handleEditSale(sale)}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                            onClick={() => handleDeleteSale(sale)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Items Sold */}
                                            <div className="pt-3 border-t border-border/50">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                                    Items Sold ({itemCount} units)
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {sale.sale_items.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="px-3 py-1.5 rounded-lg bg-background/50 border border-border/50"
                                                        >
                                                            <span className="text-sm font-medium">
                                                                {item.medicines?.name || 'Unknown'}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground ml-2">
                                                                ×{item.quantity}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Sale Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl glass-card">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            <Pencil className="w-6 h-6 text-primary" />
                            Edit Sale
                        </DialogTitle>
                        <DialogDescription>
                            Update customer details, payment method, and item quantities
                        </DialogDescription>
                    </DialogHeader>
                    {editingSale && (
                        <div className="space-y-6 py-4">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Customer Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="edit-customer-name">Customer Name</Label>
                                        <Input
                                            id="edit-customer-name"
                                            value={editCustomerName}
                                            onChange={(e) => setEditCustomerName(e.target.value)}
                                            placeholder="Walk-in"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-customer-phone">Phone Number</Label>
                                        <Input
                                            id="edit-customer-phone"
                                            value={editCustomerPhone}
                                            onChange={(e) => setEditCustomerPhone(e.target.value)}
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="edit-payment-method">Payment Method</Label>
                                <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                                    <SelectTrigger id="edit-payment-method">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="card">Card</SelectItem>
                                        <SelectItem value="upi">UPI</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Items Sold</h3>
                                {editItems.map((item, index) => {
                                    const saleItem = editingSale.sale_items.find(si => si.batch_id === item.id);
                                    return (
                                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border/50">
                                            <div>
                                                <p className="font-medium">{saleItem?.medicines?.name || 'Unknown'}</p>
                                                <p className="text-xs text-muted-foreground">₹{saleItem?.unit_price.toFixed(2)} each</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Button variant="outline" size="icon" className="h-8 w-8"
                                                    onClick={() => {
                                                        const newItems = [...editItems];
                                                        if (newItems[index].quantity > 1) {
                                                            newItems[index].quantity--;
                                                            setEditItems(newItems);
                                                        }
                                                    }}>
                                                    <Minus className="w-4 h-4" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const newItems = [...editItems];
                                                        const value = parseInt(e.target.value) || 1;
                                                        newItems[index].quantity = Math.max(1, value);
                                                        setEditItems(newItems);
                                                    }}
                                                    className="w-16 text-center font-semibold"
                                                />
                                                <Button variant="outline" size="icon" className="h-8 w-8"
                                                    onClick={() => {
                                                        const newItems = [...editItems];
                                                        newItems[index].quantity++;
                                                        setEditItems(newItems);
                                                    }}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="pt-4 border-t">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold">New Total:</span>
                                    <span className="text-2xl font-bold text-emerald-500">
                                        ₹{editItems.reduce((sum, item) => {
                                            const saleItem = editingSale.sale_items.find(si => si.batch_id === item.id);
                                            return sum + (saleItem ? saleItem.unit_price * item.quantity : 0);
                                        }, 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" onClick={handleCancelEdit} className="flex-1">Cancel</Button>
                                <Button onClick={handleUpdateSale} className="flex-1">Save Changes</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
                <DialogContent className="sm:max-w-[350px] glass-card text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4"
                    >
                        <CheckCircle className="w-10 h-10 text-white" />
                    </motion.div>
                    <DialogTitle className="text-xl">Payment Successful!</DialogTitle>
                    <DialogDescription>
                        Invoice #{lastInvoiceId.slice(0, 8)} has been created
                    </DialogDescription>
                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
                            <Printer className="w-4 h-4" />
                            Print
                        </Button>
                        <Button className="flex-1" onClick={() => setIsSuccessOpen(false)}>
                            Done
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Print Receipt (Hidden from screen, shown only when printing) */}
            {
                lastSaleDetails && (
                    <div className="print-only" style={{ display: 'none' }}>
                        <style jsx global>{`
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            .print-only, .print-only * {
                                visibility: visible;
                            }
                            .print-only {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                                display: block !important;
                            }
                            @page {
                                margin: 1cm;
                                size: A4;
                            }
                        }
                    `}</style>

                        <div style={{
                            padding: '40px',
                            fontFamily: 'Arial, sans-serif',
                            maxWidth: '800px',
                            margin: '0 auto',
                            color: '#000',
                            backgroundColor: '#fff'
                        }}>
                            {/* Header */}
                            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #000', paddingBottom: '20px' }}>
                                <h1 style={{ margin: '0', fontSize: '32px', color: '#000' }}>Smart Pharmacy</h1>
                                <p style={{ margin: '5px 0', fontSize: '14px' }}>123 Medical Street, Healthcare City</p>
                                <p style={{ margin: '5px 0', fontSize: '14px' }}>Phone: +91 1234567890 | Email: contact@smartpharmacy.com</p>
                                <p style={{ margin: '10px 0', fontSize: '16px', fontWeight: 'bold' }}>SALES INVOICE</p>
                            </div>

                            {/* Invoice Details */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                                <div>
                                    <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Invoice #:</strong> {lastSaleDetails.invoiceId.slice(0, 8)}</p>
                                    <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Date:</strong> {new Date(lastSaleDetails.date).toLocaleString()}</p>
                                    <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Payment Method:</strong> {lastSaleDetails.paymentMethod.toUpperCase()}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Customer:</strong> {lastSaleDetails.customerName}</p>
                                    <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Phone:</strong> {lastSaleDetails.customerPhone}</p>
                                </div>
                            </div>

                            {/* Items Table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #000' }}>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>Medicine</th>
                                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>Batch</th>
                                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>Qty</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>Price</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lastSaleDetails.items.map((item, index) => (
                                        <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                                            <td style={{ padding: '12px', fontSize: '14px' }}>{item.name}</td>
                                            <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px' }}>{item.batch}</td>
                                            <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>{item.quantity}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>₹{item.price.toFixed(2)}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Summary */}
                            <div style={{ borderTop: '2px solid #000', paddingTop: '20px', marginLeft: 'auto', maxWidth: '300px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '14px' }}>Subtotal:</span>
                                    <span style={{ fontSize: '14px' }}>₹{lastSaleDetails.subtotal.toFixed(2)}</span>
                                </div>
                                {lastSaleDetails.discount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#16a34a' }}>
                                        <span style={{ fontSize: '14px' }}>Discount:</span>
                                        <span style={{ fontSize: '14px' }}>-₹{lastSaleDetails.discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #ddd', marginTop: '10px' }}>
                                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Total:</span>
                                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>₹{lastSaleDetails.total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{ marginTop: '50px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                                <p style={{ margin: '5px 0' }}>Thank you for your purchase!</p>
                                <p style={{ margin: '5px 0' }}>Please check the medicines before leaving. No returns after leaving the counter.</p>
                                <p style={{ margin: '15px 0', fontStyle: 'italic' }}>This is a computer-generated invoice and does not require a signature.</p>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
