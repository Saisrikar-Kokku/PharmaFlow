"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
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
import * as XLSX from "xlsx";
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
} from "lucide-react";

interface Medicine {
    id: string;
    name: string;
    generic_name: string | null;
    category_id: string;
    category_name?: string;
    sku: string;
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
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("name");
    const [currentPage, setCurrentPage] = useState(1);

    // Dialog states
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Selected medicine states
    const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
    const [medicineBatches, setMedicineBatches] = useState<Batch[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);

    // Form states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Initial stock state for Add Medicine form
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
    }, []);

    async function fetchMedicines() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("medicines_with_stock")
                .select("*")
                .order("name");

            if (error) throw error;
            setMedicines(data || []);
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

        try {
            const { error } = await supabase.from("batches").delete().eq("id", batchId);

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

        setIsDeleting(true);
        try {
            // First delete all associated batches
            const { error: batchError } = await supabase
                .from("batches")
                .delete()
                .eq("medicine_id", selectedMedicine.id);

            if (batchError) {
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

            if (error) throw error;

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

    // Export medicines to Excel
    async function handleExport() {
        setIsExporting(true);
        try {
            const exportData = medicines.map((med) => ({
                "Medicine Name": med.name,
                "Generic Name": med.generic_name || "",
                "Category": med.category_name || "",
                "SKU": med.sku,
                "Dosage Form": med.dosage_form || "tablet",
                "Current Stock": med.total_stock || 0,
                "Reorder Level": med.reorder_level,
                "Max Stock Level": med.max_stock_level || 500,
                "Status": getStockStatus(med),
                "Active": med.is_active ? "Yes" : "No",
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Medicines");

            worksheet["!cols"] = [
                { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
                { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 8 },
            ];

            XLSX.writeFile(workbook, `PharmaFlow_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Inventory exported successfully!");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export inventory");
        } finally {
            setIsExporting(false);
        }
    }

    // Download Complete Pharmacy Template
    function handleDownloadTemplate() {
        const templateData = [
            {
                "Medicine Name": "Paracetamol 500mg Tablets",
                "Generic Name": "Acetaminophen",
                "Category": "Painkillers",
                "SKU": "PARA-500-TAB",
                "Dosage Form": "Tablet",
                "Strength": "500mg",
                "Manufacturer": "ABC Pharma",
                "Requires Prescription": "No",
                "Reorder Level": 100,
                "Max Stock Level": 500,
                "Batch Number": "BT-2024-001",
                "Quantity": 200,
                "Manufacturing Date": "2024-01-15",
                "Expiry Date": "2025-12-31",
                "Cost Price": 10.00,
                "Selling Price": 12.00,
                "Supplier": "MedSupply Co",
                "Location": "Shelf A1",
                "Barcode": "8901234567890",
                "HSN Code": "30049099",
                "Notes": "Fast-moving item"
            },
            {
                "Medicine Name": "Paracetamol 500mg Tablets",
                "Generic Name": "Acetaminophen",
                "Category": "Painkillers",
                "SKU": "PARA-500-TAB",
                "Dosage Form": "Tablet",
                "Strength": "500mg",
                "Manufacturer": "ABC Pharma",
                "Requires Prescription": "No",
                "Reorder Level": 100,
                "Max Stock Level": 500,
                "Batch Number": "BT-2024-002",
                "Quantity": 150,
                "Manufacturing Date": "2024-02-10",
                "Expiry Date": "2026-03-31",
                "Cost Price": 9.50,
                "Selling Price": 12.00,
                "Supplier": "MedSupply Co",
                "Location": "Shelf A1",
                "Barcode": "8901234567890",
                "HSN Code": "30049099",
                "Notes": "Second batch - same medicine"
            },
            {
                "Medicine Name": "Amoxicillin 500mg Capsules",
                "Generic Name": "Amoxicillin",
                "Category": "Antibiotics",
                "SKU": "AMOX-500-CAP",
                "Dosage Form": "Capsule",
                "Strength": "500mg",
                "Manufacturer": "XYZ Pharma",
                "Requires Prescription": "Yes",
                "Reorder Level": 50,
                "Max Stock Level": 300,
                "Batch Number": "BT-2024-010",
                "Quantity": 100,
                "Manufacturing Date": "2024-01-20",
                "Expiry Date": "2025-06-30",
                "Cost Price": 20.00,
                "Selling Price": 25.00,
                "Supplier": "PharmaDist Ltd",
                "Location": "Refrigerator",
                "Barcode": "8901234567901",
                "HSN Code": "30042000",
                "Notes": "Keep refrigerated"
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

        // Comprehensive instructions
        const instructions = [
            { "Field Guide": "📋 PHARMACY INVENTORY IMPORT TEMPLATE - Complete Field Guide" },
            { "Field Guide": "" },
            { "Field Guide": "✅ REQUIRED FIELDS (Must be filled):" },
            { "Field Guide": "1. Medicine Name - Full name with strength (e.g., 'Paracetamol 500mg Tablets')" },
            { "Field Guide": "2. SKU - Unique stock keeping unit code (e.g., 'PARA-500-TAB')" },
            { "Field Guide": "3. Category - Medicine category (see available categories below)" },
            { "Field Guide": "4. Batch Number - Unique batch identifier (e.g., 'BT-2024-001')" },
            { "Field Guide": "5. Quantity - Number of units in this batch" },
            { "Field Guide": "6. Expiry Date - Format: YYYY-MM-DD (e.g., '2025-12-31')" },
            { "Field Guide": "7. Selling Price - Retail/MRP price per unit" },
            { "Field Guide": "" },
            { "Field Guide": "⭐ HIGHLY RECOMMENDED:" },
            { "Field Guide": "• Generic Name - International non-proprietary name" },
            { "Field Guide": "• Requires Prescription - Yes/No (for legal compliance)" },
            { "Field Guide": "• Cost Price - Purchase price for profit tracking" },
            { "Field Guide": "• Manufacturer - Company name" },
            { "Field Guide": "• Supplier - Who supplied this batch" },
            { "Field Guide": "" },
            { "Field Guide": "📦 OPTIONAL FIELDS (Auto-filled if blank):" },
            { "Field Guide": "• Dosage Form - Tablet (default), Capsule, Syrup, Injection, Cream, etc." },
            { "Field Guide": "• Strength - e.g., '500mg', '10ml' (often included in medicine name)" },
            { "Field Guide": "• Reorder Level - Min quantity before alert (default: 50)" },
            { "Field Guide": "• Max Stock Level - Maximum storage capacity (default: 500)" },
            { "Field Guide": "• Manufacturing Date - When produced (default: today)" },
            { "Field Guide": "• Location - Storage location (default: 'Main Storage')" },
            { "Field Guide": "• Barcode - Product barcode number" },
            { "Field Guide": "• HSN Code - Harmonized System Code for tax classification" },
            { "Field Guide": "• Notes - Remarks or special instructions" },
            { "Field Guide": "" },
            { "Field Guide": "🔄 MULTIPLE BATCHES:" },
            { "Field Guide": "To add multiple batches for the same medicine, use separate rows with:" },
            { "Field Guide": "• SAME SKU (identifies it's the same medicine)" },
            { "Field Guide": "• DIFFERENT Batch Numbers (makes each batch unique)" },
            { "Field Guide": "See rows 1 & 2 in template for example" },
            { "Field Guide": "" },
            { "Field Guide": "📂 AVAILABLE CATEGORIES:" },
            ...categories.map(c => ({ "Field Guide": `• ${c.name}` })),
            { "Field Guide": "" },
            { "Field Guide": "💡 TIPS:" },
            { "Field Guide": "• Use consistent date format: YYYY-MM-DD" },
            { "Field Guide": "• Prices can include decimals (e.g., 12.50)" },
            { "Field Guide": "• If category doesn't exist, it will be auto-created" },
            { "Field Guide": "• Keep SKU format consistent (e.g., PRODUCTNAME-STRENGTH-FORM)" },
            { "Field Guide": "• For refrigerated items, mention in Notes and Location" }
        ];

        const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
        instructionsSheet["!cols"] = [{ wch: 100 }];
        XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

        XLSX.writeFile(workbook, "PharmaFlow_Complete_Template.xlsx");
        toast.success("Complete template downloaded with all pharmacy fields!");
    }

    // Import from Excel or CSV - Auto-creates categories and suppliers
    async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            // Parse CSV or Excel
            let jsonData: any[] = [];
            if (file.name.endsWith('.csv')) {
                const text = await file.text();
                const workbook = XLSX.read(text, { type: 'string' });
                jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            } else {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            }

            if (jsonData.length === 0) {
                toast.error("No data found in file");
                setIsImportDialogOpen(false);
                return;
            }

            // Auto-create default supplier if none exists
            let { data: suppliers } = await supabase.from("suppliers").select("id").limit(1);
            if (!suppliers || suppliers.length === 0) {
                const { data: newSupplier } = await supabase
                    .from("suppliers")
                    .insert({ name: "Default Supplier", contact_person: "Admin", email: "admin@pharmacy.com", phone: "0000000000" })
                    .select("id")
                    .single();
                suppliers = newSupplier ? [newSupplier] : [];
            }
            const supplierId = suppliers?.[0]?.id;

            // Build category map and track missing categories
            const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
            const categoriesToCreate = new Set<string>();

            // First pass: collect missing categories
            for (const row of jsonData) {
                const catName = String(row["Category"] || "").trim();
                if (catName && !categoryMap.has(catName.toLowerCase())) {
                    categoriesToCreate.add(catName);
                }
            }



            // Auto-create missing categories
            for (const catName of categoriesToCreate) {
                const { data: newCat } = await supabase
                    .from("categories")
                    .insert({ name: catName, description: `Auto-created category: ${catName}`, color: '#6366f1' })
                    .select("id, name")
                    .single();
                if (newCat) {
                    categoryMap.set(newCat.name.toLowerCase(), newCat.id);

                }
            }



            // Refresh categories for UI
            await fetchCategories();

            let medCount = 0;
            let batchCount = 0;
            let errors = 0;

            for (const row of jsonData) {
                try {
                    const name = String(row["Medicine Name"] || "").trim();
                    const catName = String(row["Category"] || "General").trim();
                    const sku = String(row["SKU"] || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`).trim();

                    if (!name) {
                        console.warn("Skipping row - missing medicine name:", row);
                        errors++;
                        continue;
                    }

                    const categoryId = categoryMap.get(catName.toLowerCase());
                    if (!categoryId) {
                        console.error("Skipping row - category not found:", catName, "Available categories:", Array.from(categoryMap.keys()));
                        errors++;
                        continue;
                    }

                    // Check if medicine exists
                    const { data: existing } = await supabase
                        .from("medicines")
                        .select("id")
                        .eq("sku", sku)
                        .maybeSingle();  // Use maybeSingle() instead of single() to avoid errors

                    let medicineId: string;

                    if (existing) {
                        medicineId = existing.id;
                    } else {
                        // Sanitize barcode - set to null if it looks like scientific notation or duplicate
                        let barcode = String(row["Barcode"] || "").trim();
                        if (barcode.includes('E+') || barcode.includes('e+') || barcode === '8.90123E+12') {
                            barcode = ""; // Reset to empty for auto-generation or null
                        }

                        // Create medicine with ALL pharmacy fields
                        const { data: newMed, error: medErr } = await supabase
                            .from("medicines")
                            .insert({
                                name,
                                generic_name: String(row["Generic Name"] || "").trim() || null,
                                category_id: categoryId,
                                sku,
                                dosage_form: String(row["Dosage Form"] || "Tablet").toLowerCase(),
                                strength: String(row["Strength"] || "").trim() || null,
                                manufacturer: String(row["Manufacturer"] || "").trim() || null,
                                barcode: barcode || null, // Allow null for duplicate barcodes
                                hsn_code: String(row["HSN Code"] || "").trim() || null,
                                reorder_level: Number(row["Reorder Level"]) || 50,
                                max_stock_level: Number(row["Max Stock Level"]) || 500,
                                requires_prescription: String(row["Requires Prescription"] || "no").toLowerCase() === "yes",
                                notes: String(row["Notes"] || "").trim() || null,
                            })
                            .select("id")
                            .single();

                        if (medErr || !newMed) {
                            console.error("Medicine create error:", medErr);
                            errors++;
                            continue;
                        }
                        medicineId = newMed.id;
                        medCount++;
                    }

                    // Always create batch with stock (default to 0 if not specified)
                    const qty = Number(row["Quantity"] || row["Stock"] || row["Units"] || 0);
                    const batchNum = String(row["Batch Number"] || row["Batch"] || `BT-${Date.now()}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`);

                    // Flexible date parser for DD-MM-YYYY, YYYY-MM-DD, and Excel serial numbers
                    function parseFlexibleDate(dateStr: string): Date {
                        if (!dateStr) {
                            console.warn("Empty date string, using today");
                            return new Date();
                        }

                        const str = String(dateStr).trim();

                        // Try Excel serial number (e.g., "45294.00011574074")
                        const excelSerial = parseFloat(str);
                        if (!isNaN(excelSerial) && excelSerial > 1000 && excelSerial < 100000) {
                            // Excel dates are days since 1900-01-01 (with a leap year bug)
                            const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899 (Excel's epoch)
                            const date = new Date(excelEpoch.getTime() + excelSerial * 86400000);
                            if (!isNaN(date.getTime())) {

                                return date;
                            }
                        }

                        // Try DD-MM-YYYY format (e.g., "15-01-2024" or "15/01/2024")
                        const ddmmyyyyMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
                        if (ddmmyyyyMatch) {
                            const [_, day, month, year] = ddmmyyyyMatch;
                            const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                            if (!isNaN(date.getTime())) {

                                return date;
                            }
                        }

                        // Try standard Date parsing (YYYY-MM-DD)
                        const standardDate = new Date(str);
                        if (!isNaN(standardDate.getTime())) {

                            return standardDate;
                        }

                        // Fallback to today
                        console.warn(`❌ Failed to parse date: "${str}", using today`);
                        return new Date();
                    }

                    // Manufacturing date
                    let mfgDate = new Date();
                    if (row["Manufacturing Date"] || row["Mfg Date"]) {
                        const mfgStr = String(row["Manufacturing Date"] || row["Mfg Date"]);
                        mfgDate = parseFlexibleDate(mfgStr);

                    }

                    // Smart expiry date: 2 years from manufacturing by default
                    let expiry = new Date(mfgDate);
                    expiry.setFullYear(expiry.getFullYear() + 2);
                    if (row["Expiry Date"] || row["Expiry"]) {
                        const expiryStr = String(row["Expiry Date"] || row["Expiry"]);
                        expiry = parseFlexibleDate(expiryStr);

                    }

                    // Validate dates: manufacturing must be before expiry
                    if (mfgDate >= expiry) {
                        console.warn(`Invalid dates for ${name}: mfg=${mfgDate.toISOString()}, expiry=${expiry.toISOString()}. Using defaults.`);
                        mfgDate = new Date();
                        expiry = new Date(mfgDate);
                        expiry.setFullYear(expiry.getFullYear() + 2);
                    }


                    const cost = Number(row["Cost Price"] || row["Cost"] || row["Purchase Price"] || 10);
                    const sell = Number(row["Selling Price"] || row["Price"] || row["MRP"] || cost * 1.3);

                    // Lookup supplier by name if provided
                    let batchSupplierId = supplierId;
                    const supplierName = String(row["Supplier"] || "").trim();
                    if (supplierName) {
                        const { data: supplierData } = await supabase
                            .from("suppliers")
                            .select("id")
                            .ilike("name", supplierName)
                            .limit(1)
                            .maybeSingle();  // Use maybeSingle() to avoid errors
                        if (supplierData) {
                            batchSupplierId = supplierData.id;
                        }
                    }

                    const { error: batchErr } = await supabase.from("batches").insert({
                        medicine_id: medicineId,
                        batch_number: batchNum,
                        manufacturing_date: mfgDate.toISOString().split('T')[0],
                        expiry_date: expiry.toISOString().split('T')[0],
                        quantity: qty,
                        initial_quantity: qty,
                        cost_price: cost,
                        selling_price: sell,
                        supplier_id: batchSupplierId,
                        received_date: new Date().toISOString().split('T')[0],
                        location: String(row["Location"] || row["Storage"] || "Main Storage"),
                    });

                    if (!batchErr) batchCount++;
                } catch (err) {
                    console.error("Row error:", err);
                    errors++;
                }
            }

            // Show friendly results
            if (medCount > 0 || batchCount > 0) {
                toast.success(`✅ Successfully imported ${medCount} medicines with ${batchCount} stock batches!`);
                fetchMedicines();
            }
            if (errors > 0) {
                toast.warning(`⚠️ ${errors} rows skipped (missing required data)`);
            }
            if (categoriesToCreate.size > 0) {
                toast.info(`ℹ️ Auto-created ${categoriesToCreate.size} new categories`);
            }

            setIsImportDialogOpen(false);
        } catch (error: any) {
            console.error("Import error:", error);
            toast.error(`Import failed: ${error.message}`);
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

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
            fetchMedicines();
        } catch (error) {
            console.error("Error adding medicine:", error);
            toast.error("Failed to add medicine");
        } finally {
            setIsSubmitting(false);
        }
    }

    const filteredMedicines = medicines
        .filter((med) => {
            const matchesSearch =
                med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                med.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (med.generic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
            const matchesCategory = selectedCategory === "all" || med.category_id === selectedCategory;
            const matchesStatus = statusFilter === "all" || getStockStatus(med) === statusFilter;
            return matchesSearch && matchesCategory && matchesStatus;
        })
        .sort((a, b) => {
            if (sortBy === "name") return a.name.localeCompare(b.name);
            if (sortBy === "stock") return (b.total_stock || 0) - (a.total_stock || 0);
            return 0;
        });

    const totalPages = Math.ceil(filteredMedicines.length / itemsPerPage);
    const paginatedMedicines = filteredMedicines.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalMedicines = medicines.length;
    const lowStockCount = medicines.filter((m) => m.is_low_stock).length;
    const outOfStockCount = medicines.filter((m) => m.is_out_of_stock || m.total_stock === 0).length;
    const totalStock = medicines.reduce((sum, m) => sum + (m.total_stock || 0), 0);

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Hidden file input for import */}
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImport} />

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
                    {/* Import Dialog */}
                    <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Upload className="w-4 h-4" />Import
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] glass-card">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-primary" />Import Medicines from Excel
                                </DialogTitle>
                                <DialogDescription>Upload an Excel file to bulk import medicines</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="p-4 rounded-lg bg-accent/50 space-y-3">
                                    <h4 className="font-medium flex items-center gap-2"><FileDown className="w-4 h-4" />Step 1: Download Template</h4>
                                    <p className="text-sm text-muted-foreground">Download the Excel template with the correct format.</p>
                                    <Button variant="outline" onClick={handleDownloadTemplate} className="w-full gap-2">
                                        <Download className="w-4 h-4" />Download Template
                                    </Button>
                                </div>
                                <div className="p-4 rounded-lg bg-accent/50 space-y-3">
                                    <h4 className="font-medium flex items-center gap-2"><Upload className="w-4 h-4" />Step 2: Upload Filled Template</h4>
                                    <p className="text-sm text-muted-foreground">Fill in your medicines and upload the Excel file.</p>
                                    <Button onClick={() => fileInputRef.current?.click()} className="w-full gap-2 bg-gradient-to-r from-primary to-pharma-emerald" disabled={isImporting}>
                                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        {isImporting ? "Importing..." : "Upload Excel File"}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" className="gap-2" onClick={handleExport} disabled={isExporting}>
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Export
                    </Button>

                    {/* Add Medicine Dialog */}
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

                                {/* Footer */}
                                <DialogFooter className="p-8 border-t bg-background shrink-0 flex items-center justify-between gap-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
                                    <Button
                                        variant="ghost"
                                        className="text-lg px-8 h-14 font-semibold text-muted-foreground border-transparent hover:bg-accent/50 rounded-2xl"
                                        onClick={() => setIsAddDialogOpen(false)}
                                    >Discard Changes</Button>
                                    <Button
                                        className="h-14 px-12 text-xl font-bold rounded-2xl bg-gradient-to-r from-primary to-pharma-emerald shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                                        onClick={handleAddMedicine}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <span>Add Medicine to Store</span>
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </div>
                        </DialogContent>
                    </Dialog>
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
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder="Search medicines, SKU, or generic name..." className="pl-10 bg-background/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
        </div>
    );
}

