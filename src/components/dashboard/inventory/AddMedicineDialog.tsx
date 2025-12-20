"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Info, Pill, Beaker, Settings2, Plus, Layers, Package, Save, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface AddMedicineDialogProps {
    categories: any[];
    onSuccess: () => void;
}

export default function AddMedicineDialog({ categories, onSuccess }: AddMedicineDialogProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();

    // New Medicine State
    const [newMedicine, setNewMedicine] = useState({
        name: "",
        generic_name: "",
        category_id: "",
        sku: "",
        dosage_form: "tablet",
        reorder_level: 50,
        max_stock_level: 500,
        requires_prescription: false,
    });

    // Initial Stock State
    const [isAddingInitialStock, setIsAddingInitialStock] = useState(false);
    const [initialStockData, setInitialStockData] = useState({
        batch_number: "",
        quantity: 0,
        manufacturing_date: "",
        expiry_date: "",
        cost_price: 0,
        selling_price: 0,
        location: "Main Storage",
    });

    async function handleAddMedicine() {
        if (!newMedicine.name || !newMedicine.category_id || !newMedicine.sku) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            // Validation for initial stock
            if (isAddingInitialStock) {
                if (!initialStockData.batch_number) {
                    toast.error("Batch number is required for initial stock");
                    setIsSubmitting(false);
                    return;
                }
                if (initialStockData.quantity <= 0) {
                    toast.error("Quantity must be greater than 0");
                    setIsSubmitting(false);
                    return;
                }
                if (!initialStockData.expiry_date) {
                    toast.error("Expiry date is required");
                    setIsSubmitting(false);
                    return;
                }
            }

            // 1. Insert Medicine
            const { data: medData, error: medError } = await supabase
                .from("medicines")
                .insert({
                    name: newMedicine.name,
                    generic_name: newMedicine.generic_name || null,
                    category_id: newMedicine.category_id,
                    sku: newMedicine.sku,
                    dosage_form: newMedicine.dosage_form,
                    reorder_level: newMedicine.reorder_level,
                    max_stock_level: newMedicine.max_stock_level,
                    requires_prescription: newMedicine.requires_prescription,
                })
                .select()
                .single();

            if (medError) throw medError;

            // 2. Insert Initial Stock (if enabled)
            if (isAddingInitialStock && medData) {
                const { error: batchError } = await supabase.from("batches").insert({
                    medicine_id: medData.id,
                    batch_number: initialStockData.batch_number,
                    quantity: initialStockData.quantity,
                    initial_quantity: initialStockData.quantity,
                    manufacturing_date: initialStockData.manufacturing_date || null,
                    expiry_date: initialStockData.expiry_date,
                    cost_price: initialStockData.cost_price,
                    selling_price: initialStockData.selling_price,
                    location: initialStockData.location || "Main Storage",
                    status: "active",
                });

                if (batchError) {
                    console.error("Error adding initial stock:", batchError);
                    toast.error("Medicine added, but failed to add initial stock");
                } else {
                    toast.success("Medicine and initial stock added successfully!");
                }
            } else {
                toast.success("Medicine added successfully!");
            }

            setIsAddDialogOpen(false);
            setNewMedicine({
                name: "",
                generic_name: "",
                category_id: "",
                sku: "",
                dosage_form: "tablet",
                reorder_level: 50,
                max_stock_level: 500,
                requires_prescription: false,
            });
            // Reset stock data
            setIsAddingInitialStock(false);
            setInitialStockData({
                batch_number: "",
                quantity: 0,
                manufacturing_date: "",
                expiry_date: "",
                cost_price: 0,
                selling_price: 0,
                location: "Main Storage",
            });

            onSuccess(); // Triggers refresh in parent
        } catch (error) {
            console.error("Error adding medicine:", error);
            toast.error("Failed to add medicine");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-primary to-pharma-emerald hover:opacity-90">
                    <Plus className="w-4 h-4" />Add Medicine
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-6xl glass-card overflow-hidden p-0 gap-0 border-white/10 ring-1 ring-white/20 shadow-2xl">
                <div className="flex flex-col h-[85vh] lg:h-auto max-h-[90vh]">
                    {/* Header */}
                    <DialogHeader className="p-8 border-b bg-gradient-to-br from-primary/5 via-transparent to-accent/5 relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                                <Pill className="w-8 h-8 text-primary shadow-sm" />
                            </div>
                            <div>
                                <DialogTitle className="text-3xl font-black bg-gradient-to-r from-primary via-primary/80 to-pharma-emerald bg-clip-text text-transparent tracking-tight">Add New Medicine</DialogTitle>
                                <DialogDescription className="text-lg text-muted-foreground font-medium">Create a new product record and initialize your stock levels.</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Scrollable Form Content */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-card/30 backdrop-blur-md">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                            {/* Left Panel: Primary Details */}
                            <div className="lg:col-span-12 xl:col-span-7 space-y-10">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Info className="w-4 h-4 text-primary" />
                                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary/70">Core Identification</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60 ml-1">Medicine Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                className="h-14 text-xl font-medium px-5 rounded-2xl bg-background/50 border-primary/10 focus:border-primary focus:ring-4 focus:ring-primary/5 shadow-sm transition-all"
                                                placeholder="e.g., Amoxicillin 500mg"
                                                value={newMedicine.name}
                                                onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60 ml-1">Generic Name</Label>
                                            <Input
                                                className="h-14 text-xl font-medium px-5 rounded-2xl bg-background/50 border-primary/10 transition-all focus:border-primary/50"
                                                placeholder="e.g., Amoxicillin"
                                                value={newMedicine.generic_name}
                                                onChange={(e) => setNewMedicine({ ...newMedicine, generic_name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60 ml-1">Classification <span className="text-red-500">*</span></Label>
                                            <Select value={newMedicine.category_id} onValueChange={(value) => setNewMedicine({ ...newMedicine, category_id: value })}>
                                                <SelectTrigger className="h-14 text-lg px-5 rounded-2xl bg-background/50 border-primary/10 shadow-sm">
                                                    <SelectValue placeholder="Select Category" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {categories.map((cat) => (
                                                        <SelectItem key={cat.id} value={cat.id} className="py-3 text-lg">{cat.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60 ml-1">Inventory SKU <span className="text-red-500">*</span></Label>
                                            <Input
                                                className="h-14 text-xl font-mono px-5 rounded-2xl bg-background/50 border-primary/10 transition-all focus:border-primary/50"
                                                placeholder="SKU-CODE-001"
                                                value={newMedicine.sku}
                                                onChange={(e) => setNewMedicine({ ...newMedicine, sku: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-border/40">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Beaker className="w-4 h-4 text-primary" />
                                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary/70">Medical Specifications</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60 ml-1">Dosage Form</Label>
                                            <Select value={newMedicine.dosage_form} onValueChange={(value) => setNewMedicine({ ...newMedicine, dosage_form: value })}>
                                                <SelectTrigger className="h-14 text-lg px-5 rounded-2xl bg-background/50 border-primary/10 shadow-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="tablet" className="py-2 text-lg">Tablet</SelectItem>
                                                    <SelectItem value="capsule" className="py-2 text-lg">Capsule</SelectItem>
                                                    <SelectItem value="syrup" className="py-2 text-lg">Syrup</SelectItem>
                                                    <SelectItem value="injection" className="py-2 text-lg">Injection</SelectItem>
                                                    <SelectItem value="cream" className="py-2 text-lg">Cream</SelectItem>
                                                    <SelectItem value="drops" className="py-2 text-lg">Drops</SelectItem>
                                                    <SelectItem value="other" className="py-2 text-lg">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60 ml-1">Prescription Control</Label>
                                            <div className="flex p-1 bg-background/50 border border-primary/10 rounded-2xl h-14">
                                                <button
                                                    className={`flex-1 rounded-xl transition-all font-bold text-sm ${!newMedicine.requires_prescription ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:bg-white/50'}`}
                                                    onClick={() => setNewMedicine({ ...newMedicine, requires_prescription: false })}
                                                >OTC / Regular</button>
                                                <button
                                                    className={`flex-1 rounded-xl transition-all font-bold text-sm ${newMedicine.requires_prescription ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:bg-white/50'}`}
                                                    onClick={() => setNewMedicine({ ...newMedicine, requires_prescription: true })}
                                                >Rx Required</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Inventory Controls & Initial Stock */}
                            <div className="lg:col-span-12 xl:col-span-5 space-y-8">
                                <Card className="border-0 shadow-sm bg-gradient-to-br from-accent/50 to-background rounded-[2rem] overflow-hidden">
                                    <CardContent className="p-8 space-y-8">
                                        <div className="flex items-center gap-2">
                                            <Settings2 className="w-5 h-5 text-primary" />
                                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary/70">Inventory Policy</h3>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <Label className="text-xs font-bold text-foreground/50 uppercase ml-1">Reorder At</Label>
                                                <Input
                                                    type="number"
                                                    className="h-12 bg-background/80 text-lg font-bold border-amber-200/50 focus:border-amber-500 rounded-xl"
                                                    value={newMedicine.reorder_level}
                                                    onChange={(e) => setNewMedicine({ ...newMedicine, reorder_level: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-xs font-bold text-foreground/50 uppercase ml-1">Stock Cap</Label>
                                                <Input
                                                    type="number"
                                                    className="h-12 bg-background/80 text-lg font-bold border-primary/20 rounded-xl"
                                                    value={newMedicine.max_stock_level}
                                                    onChange={(e) => setNewMedicine({ ...newMedicine, max_stock_level: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>

                                        {/* Initial Stock Switch Card */}
                                        <div className={`p-6 rounded-[1.5rem] border transition-all duration-300 ${isAddingInitialStock ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-background/80 border-border/50 hover:border-primary/30'}`}>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isAddingInitialStock ? 'bg-white/20' : 'bg-primary/10'}`}>
                                                        <Layers className={`w-6 h-6 ${isAddingInitialStock ? 'text-white' : 'text-primary'}`} />
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold text-lg ${isAddingInitialStock ? 'text-white' : 'text-foreground'}`}>Initial Stock</p>
                                                        <p className={`text-xs ${isAddingInitialStock ? 'text-white/70' : 'text-muted-foreground'}`}>Add your first batch now</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={isAddingInitialStock}
                                                    onCheckedChange={setIsAddingInitialStock}
                                                    className="data-[state=checked]:bg-white data-[state=checked]:[&>span]:bg-primary h-8 w-14 shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <AnimatePresence>
                                    {isAddingInitialStock && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                                            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                            exit={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                                            transition={{ type: "spring", damping: 20 }}
                                        >
                                            <Card className="border-0 shadow-2xl bg-gradient-to-br from-white/80 to-accent/20 dark:from-card dark:to-accent/5 rounded-[2rem] overflow-hidden ring-1 ring-primary/20">
                                                <div className="h-2 bg-gradient-to-r from-primary via-pharma-emerald to-primary w-full opacity-30" />
                                                <CardContent className="p-8 space-y-8">
                                                    <div className="flex items-center justify-between pb-2 border-b border-primary/10">
                                                        <div className="flex items-center gap-3">
                                                            <Package className="w-5 h-5 text-primary" />
                                                            <span className="text-sm font-bold uppercase tracking-widest text-primary/80">Stock Details</span>
                                                        </div>
                                                        <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">Active Entry</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-6 pb-2">
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Batch ID</Label>
                                                            <Input
                                                                placeholder="BATCH-01"
                                                                className="h-12 bg-background/50 text-base font-black border-primary/20"
                                                                value={initialStockData.batch_number}
                                                                onChange={(e) => setInitialStockData({ ...initialStockData, batch_number: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Quantity (Units)</Label>
                                                            <Input
                                                                type="number"
                                                                className="h-12 bg-background/50 text-xl font-black text-primary border-primary/20 text-center"
                                                                value={initialStockData.quantity}
                                                                onChange={(e) => setInitialStockData({ ...initialStockData, quantity: parseInt(e.target.value) || 0 })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">MFG Date</Label>
                                                            <Input
                                                                type="date"
                                                                className="h-12 bg-background/50 text-sm border-primary/10"
                                                                value={initialStockData.manufacturing_date}
                                                                onChange={(e) => setInitialStockData({ ...initialStockData, manufacturing_date: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] uppercase font-bold text-red-500">Expiry Date</Label>
                                                            <Input
                                                                type="date"
                                                                className="h-12 bg-red-50/50 border-red-200/50 text-sm font-bold text-red-600 focus:ring-red-500/10"
                                                                value={initialStockData.expiry_date}
                                                                onChange={(e) => setInitialStockData({ ...initialStockData, expiry_date: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 pt-4 border-t border-primary/10">
                                                        <div className="grid grid-cols-2 gap-8 items-center">
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Buy / Cost</p>
                                                                <div className="relative">
                                                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                                                                    <Input className="h-10 pl-4 border-0 border-b bg-transparent font-medium" type="number" value={initialStockData.cost_price} onChange={(e) => setInitialStockData({ ...initialStockData, cost_price: parseFloat(e.target.value) || 0 })} />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-bold text-emerald-600 uppercase">Sell / Price</p>
                                                                <div className="relative">
                                                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-emerald-600">₹</span>
                                                                    <Input className="h-10 pl-4 border-0 border-b bg-transparent font-black text-xl text-emerald-600" type="number" value={initialStockData.selling_price} onChange={(e) => setInitialStockData({ ...initialStockData, selling_price: parseFloat(e.target.value) || 0 })} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Location Details</Label>
                                                        <Input
                                                            placeholder="e.g. Shelf A, Row 4"
                                                            className="h-11 bg-background/50 border-primary/10 rounded-xl"
                                                            value={initialStockData.location}
                                                            onChange={(e) => setInitialStockData({ ...initialStockData, location: e.target.value })}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 border-t bg-card/50 backdrop-blur-sm shrink-0">
                        <div className="flex gap-4 w-full justify-end">
                            <Button variant="outline" size="lg" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl px-8 h-12">
                                <X className="w-5 h-5 mr-2" />Cancel
                            </Button>
                            <Button
                                size="lg"
                                className="bg-gradient-to-r from-primary to-pharma-emerald hover:shadow-lg hover:shadow-primary/20 rounded-xl px-10 h-12 text-lg font-bold"
                                onClick={handleAddMedicine}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                ) : (
                                    <Save className="w-5 h-5 mr-2" />
                                )}
                                {isSubmitting ? "Creating..." : "Save Medicine"}
                            </Button>
                        </div>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
