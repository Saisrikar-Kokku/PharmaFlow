"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Download, Loader2, FileSpreadsheet, FileDown } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

interface InventoryDataActionsProps {
    categories: any[];
    onSuccess: () => void;
}

export default function InventoryDataActions({ categories, onSuccess }: InventoryDataActionsProps) {
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    // Export medicines to Excel
    const handleExport = async () => {
        try {
            setIsExporting(true);
            const { data: allMedicines, error } = await supabase
                .from("medicines")
                .select(`
                    *,
                    category:categories(name),
                    supplier:suppliers(name),
                    batches(*)
                `);

            if (error) throw error;

            if (!allMedicines || allMedicines.length === 0) {
                toast.error("No medicines to export");
                return;
            }

            // Flatten data for export
            const exportData = allMedicines.flatMap((med: any) => {
                if (med.batches && med.batches.length > 0) {
                    return med.batches.map((batch: any) => ({
                        "Medicine Name": med.name,
                        "Generic Name": med.generic_name || "",
                        "Category": med.category?.name || "General",
                        "SKU": med.sku,
                        "Dosage Form": med.dosage_form || "Tablet",
                        "Strength": med.strength || "",
                        "Manufacturer": med.manufacturer || "",
                        "Requires Prescription": med.requires_prescription ? "Yes" : "No",
                        "Reorder Level": med.reorder_level,
                        "Current Stock": med.total_stock || 0,
                        "Batch Number": batch.batch_number,
                        "Quantity": batch.quantity,
                        "Status": batch.status,
                        "Expiry Date": batch.expiry_date,
                        "Cost Price": batch.cost_price,
                        "Selling Price": batch.selling_price,
                        "Supplier": med.supplier?.name || "Unknown",
                        "Location": batch.location || "",
                        "Barcode": med.barcode || "",
                        "HSN Code": med.hsn_code || "",
                        "Notes": med.notes || ""
                    }));
                } else {
                    return [{
                        "Medicine Name": med.name,
                        "Generic Name": med.generic_name || "",
                        "Category": med.category?.name || "General",
                        "SKU": med.sku,
                        "Dosage Form": med.dosage_form || "Tablet",
                        "Strength": med.strength || "",
                        "Manufacturer": med.manufacturer || "",
                        "Requires Prescription": med.requires_prescription ? "Yes" : "No",
                        "Reorder Level": med.reorder_level,
                        "Current Stock": 0,
                        "Batch Number": "N/A",
                        "Quantity": 0,
                        "Status": "N/A",
                        "Expiry Date": "N/A",
                        "Cost Price": 0,
                        "Selling Price": 0,
                        "Supplier": med.supplier?.name || "Unknown",
                        "Location": "",
                        "Barcode": med.barcode || "",
                        "HSN Code": med.hsn_code || "",
                        "Notes": med.notes || ""
                    }];
                }
            });

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
            XLSX.writeFile(workbook, `Pharmacy_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);

            toast.success("Inventory exported successfully!");
        } catch (error: any) {
            console.error("Export error:", error);
            toast.error("Failed to export inventory");
        } finally {
            setIsExporting(false);
        }
    };

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
            const categoryMap = new Map(categories.map((c: any) => [c.name.toLowerCase(), c.id]));
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
                        .maybeSingle();

                    let medicineId: string;

                    if (existing) {
                        medicineId = existing.id;
                    } else {
                        // Sanitize barcode - set to null if it looks like scientific notation or duplicate
                        let barcode = String(row["Barcode"] || "").trim();
                        if (barcode.includes('E+') || barcode.includes('e+') || barcode === '8.90123E+12') {
                            barcode = "";
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
                                barcode: barcode || null,
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
                            .maybeSingle();
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
            }
            if (errors > 0) {
                toast.warning(`⚠️ ${errors} rows skipped (missing required data)`);
            }
            if (categoriesToCreate.size > 0) {
                toast.info(`ℹ️ Auto-created ${categoriesToCreate.size} new categories`);
            }

            setIsImportDialogOpen(false);
            onSuccess(); // Triggers refresh
        } catch (error: any) {
            console.error("Import error:", error);
            toast.error(`Import failed: ${error.message}`);
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    return (
        <div className="flex items-center gap-2">
            {/* Hidden file input for import */}
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImport} />

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
        </div>
    );
}
