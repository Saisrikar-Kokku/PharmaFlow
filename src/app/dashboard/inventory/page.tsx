"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { TiltCard, GradientText, RevealOnScroll } from "@/components/ui/animated";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { hasPermission, getPermissionDeniedMessage, UserRole } from "@/lib/permissions";
import nextDynamic from 'next/dynamic';
const InventoryDataActions = nextDynamic(() => import('@/components/dashboard/inventory/InventoryDataActions'), { ssr: false });
const AddMedicineDialog = nextDynamic(() => import('@/components/dashboard/inventory/AddMedicineDialog'), { ssr: false });
import { useDebounce } from "@/hooks/use-debounce";
import {
    Package,
    Search,
    Filter,
    ArrowUpDown,
    Eye,
    Edit,
    Trash2,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
    CheckCircle,
    CheckCircle2,
    XCircle,
    Download,
    Upload,
    Loader2,
    Pill,
    Layers,
    Calendar,
    DollarSign,
    Save,
    X,
    Info,
    Beaker,
    Settings2,
    ArrowRight,
    Plus,
    FileSpreadsheet,
    FileDown,
    ChevronLeft,
    ScanBarcode,
} from "lucide-react";
import { BarcodeScanner } from "@/components/ui/barcode-scanner";

interface Medicine {
    id: string;
    name: string;
    generic_name: string | null;
    category_id: string;
    category_name?: string;
    sku: string;
    barcode?: string | null;
    dosage_form: string;
    reorder_level: number;
    max_stock_level?: number;
    requires_prescription?: boolean;
    is_active: boolean;
    total_stock?: number;
    is_low_stock?: boolean;
    is_out_of_stock?: boolean;
    created_at?: string;
}

interface Batch {
    id: string;
    batch_number: string;
    quantity: number;
    expiry_date: string;
    cost_price: number;
    selling_price: number;
    status: string;
    manufacturing_date?: string | null;
    location?: string | null;
}

interface Category {
    id: string;
    name: string;
    color: string | null;
}

interface Supplier {
    id: string;
    name: string;
}

const statusConfig = {
    normal: { label: "In Stock", color: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle },
    low: { label: "Low Stock", color: "bg-amber-500/10 text-amber-500", icon: AlertTriangle },
    critical: { label: "Critical", color: "bg-red-500/10 text-red-500", icon: AlertTriangle },
    out: { label: "Out of Stock", color: "bg-gray-500/10 text-gray-500", icon: XCircle },
};

function getStockStatus(medicine: Medicine) {
    if (medicine.is_out_of_stock || medicine.total_stock === 0) return "out";
    if (medicine.is_low_stock) {
        const ratio = (medicine.total_stock || 0) / medicine.reorder_level;
        if (ratio < 0.5) return "critical";
        return "low";
    }
    return "normal";
}

export default function InventoryPage() {
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("name");
    const [currentPage, setCurrentPage] = useState(1);

    // Dialog states
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Selected medicine states
    const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
    const [medicineBatches, setMedicineBatches] = useState<Batch[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);

    // Form states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [userRole, setUserRole] = useState<UserRole | null>(null);

    const [editMedicine, setEditMedicine] = useState({
        id: "",
        name: "",
        generic_name: "",
        category_id: "",
        sku: "",
        dosage_form: "tablet",
        strength: "",
        manufacturer: "",
        barcode: "",
        hsn_code: "",
        reorder_level: 50,
        max_stock_level: 500,
        requires_prescription: false,
        notes: "",
    });

    // Batch management for edit dialog
    const [editBatches, setEditBatches] = useState<Batch[]>([]);
    const [isAddingBatch, setIsAddingBatch] = useState(false);
    const [newBatch, setNewBatch] = useState({
        batch_number: "",
        quantity: 0,
        manufacturing_date: "",
        expiry_date: "",
        cost_price: 0,
        selling_price: 0,
        location: "Main Storage",
        supplier_id: "",
    });

    // Batch edit states
    const [isEditBatchDialogOpen, setIsEditBatchDialogOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
    const [editBatchData, setEditBatchData] = useState({
        batch_number: "",
        quantity: 0,
        manufacturing_date: "",
        expiry_date: "",
        cost_price: 0,
        selling_price: 0,
        location: "",
    });


    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    // Quick Add Supplier dialog
    const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
    const [quickSupplierName, setQuickSupplierName] = useState("");
    const [quickSupplierPhone, setQuickSupplierPhone] = useState("");
    const [savingQuickSupplier, setSavingQuickSupplier] = useState(false);

    const supabase = createClient();
    const itemsPerPage = 6;

    useEffect(() => {
        fetchMedicines();
        fetchCategories();
        fetchSuppliers();
        fetchUserRole();
    }, []);

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

    async function fetchMedicines() {
        setLoading(true);
        try {
            // First try the view (if it has all fields including barcode)
            const { data: viewData, error: viewError } = await supabase
                .from("medicines_with_stock")
                .select("*")
                .order("name");

            if (!viewError && viewData) {
                setMedicines(viewData);
            } else {
                // Fallback: query medicines table directly with stock calculation
                const { data: medicinesData, error: medicinesError } = await supabase
                    .from("medicines")
                    .select(`
                        id,
                        name,
                        generic_name,
                        category_id,
                        sku,
                        barcode,
                        dosage_form,
                        reorder_level,
                        max_stock_level,
                        requires_prescription,
                        is_active,
                        categories(name),
                        batches(quantity)
                    `)
                    .order("name");

                if (medicinesError) throw medicinesError;

                // Transform data to match expected format
                const transformedData: Medicine[] = (medicinesData || []).map((med: Record<string, unknown>) => {
                    const batches = med.batches as Array<{ quantity: number }> | null;
                    const category = med.categories as { name: string } | null;
                    const totalStock = batches?.reduce((sum, b) => sum + (b.quantity || 0), 0) || 0;
                    const reorderLevel = med.reorder_level as number || 50;
                    
                    return {
                        id: med.id as string,
                        name: med.name as string,
                        generic_name: med.generic_name as string | null,
                        category_id: med.category_id as string,
                        category_name: category?.name || undefined,
                        sku: med.sku as string,
                        barcode: med.barcode as string | null | undefined,
                        dosage_form: med.dosage_form as string,
                        reorder_level: reorderLevel,
                        max_stock_level: med.max_stock_level as number | undefined,
                        requires_prescription: med.requires_prescription as boolean | undefined,
                        is_active: med.is_active as boolean,
                        total_stock: totalStock,
                        is_low_stock: totalStock > 0 && totalStock <= reorderLevel,
                        is_out_of_stock: totalStock === 0,
                    };
                });

                setMedicines(transformedData);
            }
        } catch (error) {
            console.error("Error fetching medicines:", error);
            toast.error("Failed to load medicines");
        } finally {
            setLoading(false);
        }
    }

    async function fetchCategories() {
        try {
            const { data, error } = await supabase
                .from("categories")
                .select("*")
                .order("name");

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    }

    async function fetchSuppliers() {
        try {
            const { data, error } = await supabase
                .from("suppliers")
                .select("id, name")
                .order("name");

            if (error) throw error;
            setSuppliers(data || []);
        } catch (error) {
            console.error("Error fetching suppliers:", error);
        }
    }

    async function handleQuickAddSupplier() {
        if (!quickSupplierName.trim()) {
            toast.error("Supplier name is required");
            return;
        }

        try {
            setSavingQuickSupplier(true);
            const { data, error } = await supabase
                .from("suppliers")
                .insert({
                    name: quickSupplierName.trim(),
                    phone: quickSupplierPhone.trim() || null,
                    is_active: true,
                })
                .select("id, name")
                .single();

            if (error) throw error;

            // Add to suppliers list and auto-select
            if (data) {
                setSuppliers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                setNewBatch({ ...newBatch, supplier_id: data.id });
            }

            toast.success(`Supplier "${quickSupplierName}" added!`);
            setIsQuickSupplierOpen(false);
            setQuickSupplierName("");
            setQuickSupplierPhone("");
        } catch (error: any) {
            console.error("Error adding supplier:", error);
            toast.error(error.message || "Failed to add supplier");
        } finally {
            setSavingQuickSupplier(false);
        }
    }

    async function fetchMedicineBatches(medicineId: string) {
        setLoadingBatches(true);
        try {
            const { data, error } = await supabase
                .from("batches")
                .select("*")
                .eq("medicine_id", medicineId)
                .order("expiry_date", { ascending: true });

            if (error) throw error;
            setMedicineBatches(data || []);
        } catch (error) {
            console.error("Error fetching batches:", error);
            setMedicineBatches([]);
        } finally {
            setLoadingBatches(false);
        }
    }

    // View medicine
    function handleView(medicine: Medicine) {
        setSelectedMedicine(medicine);
        fetchMedicineBatches(medicine.id);
        setIsViewDialogOpen(true);
    }

    // Edit medicine
    async function handleEditClick(medicine: Medicine) {
        setSelectedMedicine(medicine);
        setEditMedicine({
            id: medicine.id,
            name: medicine.name,
            generic_name: medicine.generic_name || "",
            category_id: medicine.category_id,
            sku: medicine.sku,
            dosage_form: medicine.dosage_form || "tablet",
            strength: (medicine as any).strength || "",
            manufacturer: (medicine as any).manufacturer || "",
            barcode: (medicine as any).barcode || "",
            hsn_code: (medicine as any).hsn_code || "",
            reorder_level: medicine.reorder_level,
            max_stock_level: medicine.max_stock_level || 500,
            requires_prescription: medicine.requires_prescription || false,
            notes: (medicine as any).notes || "",
        });

        // Fetch batches for this medicine
        await fetchMedicineBatches(medicine.id);
        setEditBatches(medicineBatches);

        setIsEditDialogOpen(true);
    }

    async function handleEditSave() {
        if (!editMedicine.name || !editMedicine.category_id || !editMedicine.sku) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from("medicines")
                .update({
                    name: editMedicine.name,
                    generic_name: editMedicine.generic_name || null,
                    category_id: editMedicine.category_id,
                    sku: editMedicine.sku,
                    dosage_form: editMedicine.dosage_form,
                    strength: editMedicine.strength || null,
                    manufacturer: editMedicine.manufacturer || null,
                    barcode: editMedicine.barcode || null,
                    hsn_code: editMedicine.hsn_code || null,
                    reorder_level: editMedicine.reorder_level,
                    max_stock_level: editMedicine.max_stock_level,
                    requires_prescription: editMedicine.requires_prescription,
                    notes: editMedicine.notes || null,
                })
                .eq("id", editMedicine.id);

            if (error) throw error;

            toast.success("Medicine updated successfully!");
            setIsEditDialogOpen(false);
            fetchMedicines();
        } catch (error) {
            console.error("Error updating medicine:", error);
            toast.error("Failed to update medicine");
        } finally {
            setIsSubmitting(false);
        }
    }

    // Batch Management Handlers
    async function handleAddBatch() {
        if (!newBatch.batch_number || !newBatch.expiry_date || newBatch.quantity <= 0 || newBatch.selling_price <= 0) {
            toast.error("Please fill in all required batch fields");
            return;
        }

        if (!selectedMedicine) return;

        try {
            const { error } = await supabase.from("batches").insert({
                medicine_id: selectedMedicine.id,
                batch_number: newBatch.batch_number,
                manufacturing_date: newBatch.manufacturing_date || new Date().toISOString().split('T')[0],
                expiry_date: newBatch.expiry_date,
                quantity: newBatch.quantity,
                initial_quantity: newBatch.quantity,
                cost_price: newBatch.cost_price || 0,
                selling_price: newBatch.selling_price,
                supplier_id: newBatch.supplier_id || null,
                received_date: new Date().toISOString().split('T')[0],
                location: newBatch.location,
            });

            if (error) throw error;

            // Refetch batches from database to ensure consistency
            const { data: freshBatches } = await supabase
                .from("batches")
                .select("*")
                .eq("medicine_id", selectedMedicine.id)
                .order("created_at", { ascending: false });

            if (freshBatches) {
                setEditBatches(freshBatches as Batch[]);
            }

            toast.success("Batch added successfully!");
            setIsAddingBatch(false);
            setNewBatch({
                batch_number: "",
                quantity: 0,
                manufacturing_date: "",
                expiry_date: "",
                cost_price: 0,
                selling_price: 0,
                location: "Main Storage",
                supplier_id: "",
            });
            fetchMedicines(); // Refresh to update total stock
        } catch (error) {
            console.error("Error adding batch:", error);
            toast.error("Failed to add batch");
        }
    }

    async function handleDeleteBatch(batchId: string) {
        if (!selectedMedicine) return;

        // Permission check - only admin can delete batches
        if (!hasPermission(userRole, "DELETE_BATCH")) {
            toast.error(getPermissionDeniedMessage("delete batches", ["admin"]), {
                duration: 4000,
            });
            return;
        }

        try {
            const { error } = await supabase.from("batches").delete().eq("id", batchId);

            if (error) {
                // Check for foreign key constraint error (batch has been sold)
                if (error.code === "23503") {
                    toast.error("Cannot delete this batch - it has been sold. You can only set quantity to 0.");
                    return;
                }
                throw error;
            }

            // Refetch batches from database to ensure consistency
            const { data: freshBatches } = await supabase
                .from("batches")
                .select("*")
                .eq("medicine_id", selectedMedicine.id)
                .order("created_at", { ascending: false });

            if (freshBatches) {
                setEditBatches(freshBatches as Batch[]);
            }

            toast.success("Batch deleted successfully!");
            fetchMedicines(); // Refresh to update total stock
        } catch (error) {
            console.error("Error deleting batch:", error);
            toast.error("Failed to delete batch");
        }
    }

    // Edit batch
    function handleEditBatch(batch: Batch) {
        setEditingBatch(batch);
        setEditBatchData({
            batch_number: batch.batch_number,
            quantity: batch.quantity,
            manufacturing_date: batch.manufacturing_date || "",
            expiry_date: batch.expiry_date,
            cost_price: batch.cost_price,
            selling_price: batch.selling_price,
            location: batch.location || "Main Storage",
        });
        setIsEditBatchDialogOpen(true);
    }

    async function handleUpdateBatch() {
        if (!editingBatch || !selectedMedicine) return;

        // Validation
        if (!editBatchData.batch_number.trim()) {
            toast.error("Batch number is required");
            return;
        }

        if (editBatchData.quantity < 0) {
            toast.error("Quantity cannot be negative");
            return;
        }

        if (editBatchData.cost_price < 0 || editBatchData.selling_price < 0) {
            toast.error("Prices must be positive");
            return;
        }

        if (editBatchData.manufacturing_date && editBatchData.expiry_date) {
            const mfgDate = new Date(editBatchData.manufacturing_date);
            const expDate = new Date(editBatchData.expiry_date);
            if (expDate <= mfgDate) {
                toast.error("Expiry date must be after manufacturing date");
                return;
            }
        }

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from("batches")
                .update({
                    batch_number: editBatchData.batch_number,
                    quantity: editBatchData.quantity,
                    manufacturing_date: editBatchData.manufacturing_date || null,
                    expiry_date: editBatchData.expiry_date,
                    cost_price: editBatchData.cost_price,
                    selling_price: editBatchData.selling_price,
                    location: editBatchData.location,
                })
                .eq("id", editingBatch.id);

            if (error) throw error;

            // Refetch batches from database
            const { data: freshBatches } = await supabase
                .from("batches")
                .select("*")
                .eq("medicine_id", selectedMedicine.id)
                .order("created_at", { ascending: false });

            if (freshBatches) {
                setEditBatches(freshBatches as Batch[]);
            }

            toast.success("Batch updated successfully!");
            setIsEditBatchDialogOpen(false);
            setEditingBatch(null);
            fetchMedicines(); // Refresh to update total stock
        } catch (error) {
            console.error("Error updating batch:", error);
            toast.error("Failed to update batch");
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleCancelBatchEdit() {
        setIsEditBatchDialogOpen(false);
        setEditingBatch(null);
        setEditBatchData({
            batch_number: "",
            quantity: 0,
            manufacturing_date: "",
            expiry_date: "",
            cost_price: 0,
            selling_price: 0,
            location: "",
        });
    }


    // Delete medicine
    function handleDeleteClick(medicine: Medicine) {
        setSelectedMedicine(medicine);
        setIsDeleteDialogOpen(true);
    }

    async function handleDeleteConfirm() {
        if (!selectedMedicine) return;

        // Permission check - only admin can delete medicines
        if (!hasPermission(userRole, "DELETE_MEDICINE")) {
            toast.error(getPermissionDeniedMessage("delete medicines", ["admin"]), {
                duration: 4000,
            });
            setIsDeleteDialogOpen(false);
            return;
        }

        setIsDeleting(true);
        try {
            // First try to delete all associated batches
            const { error: batchError } = await supabase
                .from("batches")
                .delete()
                .eq("medicine_id", selectedMedicine.id);

            if (batchError) {
                // Check for foreign key constraint error (batches have sales)
                if (batchError.code === "23503") {
                    toast.error("Cannot delete this medicine - it has sales history. You can set stock to 0 and disable it instead.", {
                        duration: 5000,
                    });
                    setIsDeleteDialogOpen(false);
                    return;
                }
                console.error("Error deleting batches:", batchError);
            }

            // Delete any alerts for this medicine
            await supabase
                .from("alerts")
                .delete()
                .eq("medicine_id", selectedMedicine.id);

            // Now delete the medicine
            const { error } = await supabase
                .from("medicines")
                .delete()
                .eq("id", selectedMedicine.id);

            if (error) {
                // Check for foreign key constraint error
                if (error.code === "23503") {
                    toast.error("Cannot delete this medicine - it has related records. You can set stock to 0 instead.", {
                        duration: 5000,
                    });
                    setIsDeleteDialogOpen(false);
                    return;
                }
                throw error;
            }

            toast.success("Medicine and all related data deleted successfully!");
            setIsDeleteDialogOpen(false);
            fetchMedicines();
        } catch (error) {
            console.error("Error deleting medicine:", error);
            toast.error("Failed to delete medicine");
        } finally {
            setIsDeleting(false);
        }
    }







    // Memoize filtered medicines for performance
    const filteredMedicines = useMemo(() => {
        return medicines.filter((med) => {
            const matchesSearch =
                med.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                med.sku.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                (med.barcode?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ?? false) ||
                (med.generic_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ?? false);
            const matchesCategory = selectedCategory === "all" || med.category_id === selectedCategory;
            const matchesStatus = statusFilter === "all" || getStockStatus(med) === statusFilter;
            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [medicines, debouncedSearchQuery, selectedCategory, statusFilter])
        .sort((a, b) => {
            if (sortBy === "name") return a.name.localeCompare(b.name);
            if (sortBy === "stock") return (b.total_stock || 0) - (a.total_stock || 0);
            return 0;
        });

    // Barcode scan handler - finds medicine by barcode and opens view dialog
    const handleBarcodeScan = (barcode: string) => {
        const cleanBarcode = barcode.trim();
        
        // Search for medicine by barcode or SKU
        const foundMedicine = medicines.find(
            (med) => 
                (med.barcode && med.barcode.toLowerCase() === cleanBarcode.toLowerCase()) ||
                med.sku.toLowerCase() === cleanBarcode.toLowerCase()
        );

        if (foundMedicine) {
            handleView(foundMedicine);
            setIsScannerOpen(false);
            toast.success(`Found: ${foundMedicine.name}`, {
                icon: "📦",
            });
        } else {
            toast.error(`No product found for barcode: ${cleanBarcode}`, {
                description: "Check if the barcode is registered in inventory",
                duration: 4000,
            });
        }
    };

    // Memoize pagination calculations
    const totalPages = useMemo(() => Math.ceil(filteredMedicines.length / itemsPerPage), [filteredMedicines.length, itemsPerPage]);
    const paginatedMedicines = useMemo(() => {
        return filteredMedicines.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [filteredMedicines, currentPage, itemsPerPage]);

    // Memoize stats calculations
    const stats = useMemo(() => {
        const totalMedicines = medicines.length;
        const lowStockCount = medicines.filter((m) => m.is_low_stock).length;
        const outOfStockCount = medicines.filter((m) => m.is_out_of_stock || m.total_stock === 0).length;
        const totalStock = medicines.reduce((sum, m) => sum + (m.total_stock || 0), 0);
        return { totalMedicines, lowStockCount, outOfStockCount, totalStock };
    }, [medicines]);
    
    const { totalMedicines, lowStockCount, outOfStockCount, totalStock } = stats;

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Package className="w-8 h-8 text-primary" />
                        <GradientText>Inventory</GradientText>
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage your medicine stock and batches</p>
                </motion.div>

                <motion.div className="flex items-center gap-3" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <InventoryDataActions categories={categories} onSuccess={fetchMedicines} />
                    <AddMedicineDialog categories={categories} onSuccess={fetchMedicines} />
                </motion.div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {
                    [
                        { label: "Total Medicines", value: loading ? "-" : totalMedicines, icon: Pill, color: "from-blue-500 to-cyan-500" },
                        { label: "Low Stock", value: loading ? "-" : lowStockCount, icon: AlertTriangle, color: "from-amber-500 to-orange-500" },
                        { label: "Out of Stock", value: loading ? "-" : outOfStockCount, icon: XCircle, color: "from-red-500 to-rose-500" },
                        { label: "Total Units", value: loading ? "-" : totalStock.toLocaleString(), icon: Package, color: "from-emerald-500 to-teal-500" },
                    ].map((stat: any, index: number) => (
                        <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
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
                    ))
                }
            </div>

            {/* Filters */}
            <RevealOnScroll>
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex gap-2 flex-1">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input placeholder="Search medicines, SKU, barcode..." className="pl-10 bg-background/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </div>
                                {/* Barcode Scanner Button */}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0 hover:border-primary hover:bg-primary/10"
                                    onClick={() => setIsScannerOpen(true)}
                                    title="Scan Barcode"
                                >
                                    <ScanBarcode className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="w-[180px] bg-background/50"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Category" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px] bg-background/50"><SelectValue placeholder="Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="normal">In Stock</SelectItem>
                                        <SelectItem value="low">Low Stock</SelectItem>
                                        <SelectItem value="critical">Critical</SelectItem>
                                        <SelectItem value="out">Out of Stock</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="w-[140px] bg-background/50"><ArrowUpDown className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="name">Name</SelectItem>
                                        <SelectItem value="stock">Stock Level</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </RevealOnScroll>

            {/* Medicine Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {
                    loading ? (
                        Array.from({ length: 6 }).map((_: any, i: number) => (<Skeleton key={i} className="h-64 w-full rounded-xl" />))
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {paginatedMedicines.map((medicine, index) => {
                                const stockStatus = getStockStatus(medicine);
                                const status = statusConfig[stockStatus];
                                const StatusIcon = status.icon;

                                return (
                                    <motion.div key={medicine.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2, delay: index * 0.05 }} layout>
                                        <TiltCard>
                                            <Card className="glass-card border-white/10 hover:border-primary/30 transition-all h-full">
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <CardTitle className="text-base truncate">{medicine.name}</CardTitle>
                                                            <p className="text-xs text-muted-foreground mt-1">{medicine.generic_name || "No generic name"}</p>
                                                        </div>
                                                        <Badge className={`${status.color} shrink-0`}>
                                                            <StatusIcon className="w-3 h-3 mr-1" />{status.label}
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">Category</span>
                                                        <Badge variant="outline">{medicine.category_name || "Unknown"}</Badge>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">SKU</span>
                                                        <span className="font-mono text-xs">{medicine.sku}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">Stock</span>
                                                        <span className="font-semibold">{medicine.total_stock || 0} units</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">Reorder Level</span>
                                                        <span>{medicine.reorder_level}</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs text-muted-foreground">
                                                            <span>Stock Level</span>
                                                            <span>{Math.min(100, Math.round(((medicine.total_stock || 0) / (medicine.reorder_level * 5)) * 100))}%</span>
                                                        </div>
                                                        <div className="h-2 bg-accent rounded-full overflow-hidden">
                                                            <motion.div
                                                                className={`h-full rounded-full ${stockStatus === "out" ? "bg-gray-400" : stockStatus === "critical" ? "bg-red-500" : stockStatus === "low" ? "bg-amber-500" : "bg-gradient-to-r from-primary to-pharma-emerald"}`}
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(100, Math.round(((medicine.total_stock || 0) / (medicine.reorder_level * 5)) * 100))}%` }}
                                                                transition={{ duration: 0.5, delay: 0.2 }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 pt-2">
                                                        <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleView(medicine)}>
                                                            <Eye className="w-3 h-3" />View
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleEditClick(medicine)}>
                                                            <Edit className="w-3 h-3" />Edit
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDeleteClick(medicine)}>
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TiltCard>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    )
                }
            </div>

            {
                !loading && filteredMedicines.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No medicines found</h3>
                        <p className="text-muted-foreground">Try adjusting your search or filters</p>
                    </motion.div>
                )
            }

            {
                totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        {Array.from({ length: totalPages }, (_: any, i: number) => i + 1).map((page) => (
                            <Button key={page} variant={currentPage === page ? "default" : "outline"} size="icon" onClick={() => setCurrentPage(page)} className={currentPage === page ? "bg-primary" : ""}>
                                {page}
                            </Button>
                        ))}
                        <Button variant="outline" size="icon" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                )
            }

            {/* View Medicine Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[700px] glass-card max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pill className="w-5 h-5 text-primary" />
                            {selectedMedicine?.name}
                        </DialogTitle>
                        <DialogDescription>{selectedMedicine?.generic_name || "No generic name"}</DialogDescription>
                    </DialogHeader>
                    {selectedMedicine && (
                        <div className="space-y-6 py-4">
                            {/* Medicine Details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 rounded-lg bg-accent/50">
                                    <p className="text-xs text-muted-foreground">Category</p>
                                    <p className="font-medium">{selectedMedicine.category_name}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-accent/50">
                                    <p className="text-xs text-muted-foreground">SKU</p>
                                    <p className="font-mono text-sm">{selectedMedicine.sku}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-accent/50">
                                    <p className="text-xs text-muted-foreground">Dosage Form</p>
                                    <p className="font-medium capitalize">{selectedMedicine.dosage_form || "Tablet"}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-accent/50">
                                    <p className="text-xs text-muted-foreground">Prescription</p>
                                    <p className="font-medium">{selectedMedicine.requires_prescription ? "Required" : "Not Required"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-center">
                                    <Package className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                                    <p className="text-2xl font-bold">{selectedMedicine.total_stock || 0}</p>
                                    <p className="text-xs text-muted-foreground">Current Stock</p>
                                </div>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-center">
                                    <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                                    <p className="text-2xl font-bold">{selectedMedicine.reorder_level}</p>
                                    <p className="text-xs text-muted-foreground">Reorder Level</p>
                                </div>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-center">
                                    <Layers className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                                    <p className="text-2xl font-bold">{medicineBatches.length}</p>
                                    <p className="text-xs text-muted-foreground">Active Batches</p>
                                </div>
                            </div>

                            <Separator />

                            {/* Batches */}
                            <div>
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <Layers className="w-4 h-4" />
                                    Batches
                                </h4>
                                {loadingBatches ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                                    </div>
                                ) : medicineBatches.length > 0 ? (
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {medicineBatches.map((batch) => {
                                            const daysUntilExpiry = Math.ceil((new Date(batch.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                            const isExpired = daysUntilExpiry <= 0;
                                            const isNearExpiry = daysUntilExpiry <= 30;

                                            return (
                                                <div key={batch.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                                                    <div className="flex items-center gap-4">
                                                        <div>
                                                            <p className="font-medium text-sm">{batch.batch_number}</p>
                                                            <p className="text-xs text-muted-foreground">{batch.quantity} units</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <p className="text-sm">₹{Number(batch.selling_price).toFixed(2)}</p>
                                                            <p className="text-xs text-muted-foreground">Cost: ₹{Number(batch.cost_price).toFixed(2)}</p>
                                                        </div>
                                                        <Badge className={isExpired ? "bg-red-500/10 text-red-500" : isNearExpiry ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}>
                                                            <Calendar className="w-3 h-3 mr-1" />
                                                            {isExpired ? "Expired" : `${daysUntilExpiry}d`}
                                                        </Badge>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                                onClick={() => handleEditBatch(batch)}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => handleDeleteBatch(batch.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground">
                                        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>No batches found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                        <Button onClick={() => { setIsViewDialogOpen(false); handleEditClick(selectedMedicine!); }} className="gap-2">
                            <Edit className="w-4 h-4" />Edit Medicine
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Medicine Dialog - Enhanced with Batch Management */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[900px] glass-card max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="w-5 h-5 text-primary" />Edit Medicine & Batches
                        </DialogTitle>
                        <DialogDescription>Update medicine information and manage batches</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Medicine Details Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-primary">Medicine Information</h3>

                            {/* Row 1 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Medicine Name *</Label>
                                    <Input value={editMedicine.name} onChange={(e) => setEditMedicine({ ...editMedicine, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Generic Name</Label>
                                    <Input value={editMedicine.generic_name} onChange={(e) => setEditMedicine({ ...editMedicine, generic_name: e.target.value })} />
                                </div>
                            </div>

                            {/* Row 2 */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Category *</Label>
                                    <Select value={editMedicine.category_id} onValueChange={(value) => setEditMedicine({ ...editMedicine, category_id: value })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>SKU *</Label>
                                    <Input value={editMedicine.sku} onChange={(e) => setEditMedicine({ ...editMedicine, sku: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Strength</Label>
                                    <Input value={editMedicine.strength} onChange={(e) => setEditMedicine({ ...editMedicine, strength: e.target.value })} placeholder="e.g., 500mg" />
                                </div>
                            </div>

                            {/* Row 3 */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Dosage Form</Label>
                                    <Select value={editMedicine.dosage_form} onValueChange={(value) => setEditMedicine({ ...editMedicine, dosage_form: value })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="tablet">Tablet</SelectItem>
                                            <SelectItem value="capsule">Capsule</SelectItem>
                                            <SelectItem value="syrup">Syrup</SelectItem>
                                            <SelectItem value="injection">Injection</SelectItem>
                                            <SelectItem value="cream">Cream</SelectItem>
                                            <SelectItem value="drops">Drops</SelectItem>
                                            <SelectItem value="inhaler">Inhaler</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Manufacturer</Label>
                                    <Input value={editMedicine.manufacturer} onChange={(e) => setEditMedicine({ ...editMedicine, manufacturer: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Barcode</Label>
                                    <Input value={editMedicine.barcode} onChange={(e) => setEditMedicine({ ...editMedicine, barcode: e.target.value })} />
                                </div>
                            </div>

                            {/* Row 4 */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>HSN Code</Label>
                                    <Input value={editMedicine.hsn_code} onChange={(e) => setEditMedicine({ ...editMedicine, hsn_code: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Reorder Level</Label>
                                    <Input type="number" value={editMedicine.reorder_level} onChange={(e) => setEditMedicine({ ...editMedicine, reorder_level: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Stock</Label>
                                    <Input type="number" value={editMedicine.max_stock_level} onChange={(e) => setEditMedicine({ ...editMedicine, max_stock_level: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Prescription</Label>
                                    <Select value={editMedicine.requires_prescription ? "yes" : "no"} onValueChange={(value) => setEditMedicine({ ...editMedicine, requires_prescription: value === "yes" })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="yes">Yes</SelectItem>
                                            <SelectItem value="no">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Input value={editMedicine.notes} onChange={(e) => setEditMedicine({ ...editMedicine, notes: e.target.value })} placeholder="Any special instructions or remarks" />
                            </div>
                        </div>

                        <Separator />

                        {/* Batch Management Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-primary">Stock Batches</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Total Stock: {editBatches.reduce((sum, b) => sum + b.quantity, 0)} units
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setIsAddingBatch(!isAddingBatch)} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    {isAddingBatch ? "Cancel" : "Add Batch"}
                                </Button>
                            </div>

                            {/* Add New Batch Form */}
                            {isAddingBatch && (
                                <Card className="p-4 border-primary/20 bg-primary/5">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Batch Number *</Label>
                                            <Input className="h-8" value={newBatch.batch_number} onChange={(e) => setNewBatch({ ...newBatch, batch_number: e.target.value })} placeholder="BT-2024-001" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Quantity *</Label>
                                            <Input className="h-8" type="number" value={newBatch.quantity} onChange={(e) => setNewBatch({ ...newBatch, quantity: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Mfg Date</Label>
                                            <Input className="h-8" type="date" value={newBatch.manufacturing_date} onChange={(e) => setNewBatch({ ...newBatch, manufacturing_date: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Expiry Date *</Label>
                                            <Input className="h-8" type="date" value={newBatch.expiry_date} onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Cost Price</Label>
                                            <Input className="h-8" type="number" step="0.01" value={newBatch.cost_price} onChange={(e) => setNewBatch({ ...newBatch, cost_price: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Selling Price *</Label>
                                            <Input className="h-8" type="number" step="0.01" value={newBatch.selling_price} onChange={(e) => setNewBatch({ ...newBatch, selling_price: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs">Supplier</Label>
                                                <button type="button" onClick={() => setIsQuickSupplierOpen(true)} className="text-xs text-primary hover:underline flex items-center gap-1">
                                                    <Plus className="w-3 h-3" />New Supplier
                                                </button>
                                            </div>
                                            {isQuickSupplierOpen && (
                                                <Card className="p-3 space-y-2 bg-accent/50 border">
                                                    <Input className="h-8" placeholder="Supplier name *" value={quickSupplierName} onChange={(e) => setQuickSupplierName(e.target.value)} />
                                                    <Input className="h-8" placeholder="Phone (optional)" value={quickSupplierPhone} onChange={(e) => setQuickSupplierPhone(e.target.value)} />
                                                    <div className="flex gap-2">
                                                        <Button size="sm" className="flex-1" onClick={handleQuickAddSupplier} disabled={savingQuickSupplier}>
                                                            {savingQuickSupplier ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => { setIsQuickSupplierOpen(false); setQuickSupplierName(""); setQuickSupplierPhone(""); }}>
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </Card>
                                            )}
                                            <Select value={newBatch.supplier_id} onValueChange={(v) => setNewBatch({ ...newBatch, supplier_id: v })}>
                                                <SelectTrigger className="h-8">
                                                    <SelectValue placeholder="Select supplier" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {suppliers.map((s) => (
                                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-xs">Location</Label>
                                            <Input className="h-8" value={newBatch.location} onChange={(e) => setNewBatch({ ...newBatch, location: e.target.value })} placeholder="Shelf A1, Refrigerator, etc." />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <Button size="sm" className="flex-1" onClick={handleAddBatch}>
                                            <Save className="w-3 h-3 mr-1" />Add Batch
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => { setIsAddingBatch(false); setNewBatch({ batch_number: "", quantity: 0, manufacturing_date: "", expiry_date: "", cost_price: 0, selling_price: 0, location: "Main Storage", supplier_id: "" }); }}>
                                            Cancel
                                        </Button>
                                    </div>
                                </Card>
                            )}

                            {/* Batches Table */}
                            {editBatches.length > 0 ? (
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-accent">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Batch #</th>
                                                <th className="px-3 py-2 text-right">Qty</th>
                                                <th className="px-3 py-2 text-left">Expiry</th>
                                                <th className="px-3 py-2 text-right">Cost</th>
                                                <th className="px-3 py-2 text-right">Price</th>
                                                <th className="px-3 py-2 text-left">Location</th>
                                                <th className="px-3 py-2 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {editBatches.map((batch) => (
                                                <tr key={batch.id} className="border-t hover:bg-accent/50">
                                                    <td className="px-3 py-2 font-mono">{batch.batch_number}</td>
                                                    <td className="px-3 py-2 text-right font-semibold">{batch.quantity}</td>
                                                    <td className="px-3 py-2">{new Date(batch.expiry_date).toLocaleDateString()}</td>
                                                    <td className="px-3 py-2 text-right">₹{batch.cost_price}</td>
                                                    <td className="px-3 py-2 text-right">₹{batch.selling_price}</td>
                                                    <td className="px-3 py-2">{(batch as any).location || "N/A"}</td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex gap-1 justify-center">
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-500 mr-2" onClick={() => handleEditBatch(batch)}>
                                                                <Edit className="w-3 h-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => handleDeleteBatch(batch.id)}>
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    No batches found. Add a batch to track stock.
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            <X className="w-4 h-4 mr-2" />Cancel
                        </Button>
                        <Button className="bg-gradient-to-r from-primary to-pharma-emerald" onClick={handleEditSave} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="glass-card">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                            <Trash2 className="w-5 h-5" />Delete Medicine
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{selectedMedicine?.name}</strong>? This action cannot be undone.
                            {selectedMedicine && (selectedMedicine.total_stock || 0) > 0 && (
                                <span className="block mt-2 text-amber-500">
                                    ⚠️ This medicine has {selectedMedicine.total_stock} units in stock.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Batch Dialog */}
            <Dialog open={isEditBatchDialogOpen} onOpenChange={setIsEditBatchDialogOpen}>
                <DialogContent className="sm:max-w-[500px] glass-card">
                    <DialogHeader>
                        <DialogTitle>Edit Batch</DialogTitle>
                        <DialogDescription>Update batch details and prices</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Batch Number</Label>
                                <Input
                                    value={editBatchData.batch_number}
                                    onChange={(e) => setEditBatchData({ ...editBatchData, batch_number: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Quantity</Label>
                                <Input
                                    type="number"
                                    value={editBatchData.quantity}
                                    onChange={(e) => setEditBatchData({ ...editBatchData, quantity: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Manufacturing Date</Label>
                                <Input
                                    type="date"
                                    value={editBatchData.manufacturing_date}
                                    onChange={(e) => setEditBatchData({ ...editBatchData, manufacturing_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Expiry Date</Label>
                                <Input
                                    type="date"
                                    value={editBatchData.expiry_date}
                                    onChange={(e) => setEditBatchData({ ...editBatchData, expiry_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cost Price</Label>
                                <Input
                                    type="number"
                                    value={editBatchData.cost_price}
                                    onChange={(e) => setEditBatchData({ ...editBatchData, cost_price: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Selling Price</Label>
                                <Input
                                    type="number"
                                    value={editBatchData.selling_price}
                                    onChange={(e) => setEditBatchData({ ...editBatchData, selling_price: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                                value={editBatchData.location}
                                onChange={(e) => setEditBatchData({ ...editBatchData, location: e.target.value })}
                                placeholder="Shelf A1, Rack 3, etc."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancelBatchEdit}>Cancel</Button>
                        <Button onClick={handleUpdateBatch} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Barcode Scanner Dialog */}
            <BarcodeScanner
                mode="dialog"
                isOpen={isScannerOpen}
                onOpenChange={setIsScannerOpen}
                onScan={handleBarcodeScan}
                placeholder="Scan product barcode to view details..."
            />
        </div>
    );
}

