"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { GradientText, TiltCard } from "@/components/ui/animated";
import {
    Truck,
    Plus,
    Edit,
    Trash2,
    Loader2,
    Search,
    Phone,
    Mail,
    MapPin,
    User,
    Package,
    Eye,
    Building,
    Globe,
    CreditCard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { hasPermission, getPermissionDeniedMessage, UserRole } from "@/lib/permissions";

interface Supplier {
    id: string;
    name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    gst_number: string | null;
    payment_terms: string | null;
    is_active: boolean;
    created_at: string;
    batch_count?: number;
}

interface Batch {
    id: string;
    batch_number: string;
    quantity: number;
    medicines: { name: string } | null;
}

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [supplierBatches, setSupplierBatches] = useState<Batch[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        gst_number: "",
        payment_terms: "Net 30",
    });
    const [saving, setSaving] = useState(false);
    const [userRole, setUserRole] = useState<UserRole | null>(null);

    const supabase = createClient();

    useEffect(() => {
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

    async function fetchSuppliers() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("suppliers")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;

            // Get batch counts for each supplier
            const suppliersWithCounts = await Promise.all(
                (data || []).map(async (supplier) => {
                    const { count } = await supabase
                        .from("batches")
                        .select("*", { count: "exact", head: true })
                        .eq("supplier_id", supplier.id);
                    return { ...supplier, batch_count: count || 0 };
                })
            );

            setSuppliers(suppliersWithCounts);
        } catch (error) {
            console.error("Error fetching suppliers:", error);
            toast.error("Failed to load suppliers");
        } finally {
            setLoading(false);
        }
    }

    async function handleAddSupplier() {
        // Permission check - only admin can add suppliers
        if (!hasPermission(userRole, "ADD_SUPPLIER")) {
            toast.error(getPermissionDeniedMessage("add suppliers", ["admin"]));
            return;
        }

        if (!formData.name.trim()) {
            toast.error("Supplier name is required");
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase.from("suppliers").insert({
                name: formData.name.trim(),
                contact_person: formData.contact_person.trim() || null,
                email: formData.email.trim() || null,
                phone: formData.phone.trim() || null,
                address: formData.address.trim() || null,
                city: formData.city.trim() || null,
                state: formData.state.trim() || null,
                pincode: formData.pincode.trim() || null,
                gst_number: formData.gst_number.trim() || null,
                payment_terms: formData.payment_terms || "Net 30",
                is_active: true,
            } as any);

            if (error) throw error;

            toast.success("Supplier added successfully!");
            setIsAddDialogOpen(false);
            resetForm();
            fetchSuppliers();
        } catch (error: any) {
            console.error("Error adding supplier:", error);
            toast.error(error.message || "Failed to add supplier");
        } finally {
            setSaving(false);
        }
    }

    async function handleEditSupplier() {
        if (!selectedSupplier || !formData.name.trim()) return;

        // Permission check - only admin can edit suppliers
        if (!hasPermission(userRole, "EDIT_SUPPLIER")) {
            toast.error(getPermissionDeniedMessage("edit suppliers", ["admin"]));
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase
                .from("suppliers")
                .update({
                    name: formData.name.trim(),
                    contact_person: formData.contact_person.trim() || null,
                    email: formData.email.trim() || null,
                    phone: formData.phone.trim() || null,
                    address: formData.address.trim() || null,
                    city: formData.city.trim() || null,
                    state: formData.state.trim() || null,
                    pincode: formData.pincode.trim() || null,
                    gst_number: formData.gst_number.trim() || null,
                    payment_terms: formData.payment_terms,
                } as any)
                .eq("id", selectedSupplier.id);

            if (error) throw error;

            toast.success("Supplier updated successfully!");
            setIsEditDialogOpen(false);
            setSelectedSupplier(null);
            fetchSuppliers();
        } catch (error: any) {
            console.error("Error updating supplier:", error);
            toast.error(error.message || "Failed to update supplier");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteSupplier() {
        if (!selectedSupplier) return;

        // Permission check - only admin can delete suppliers
        if (!hasPermission(userRole, "DELETE_SUPPLIER")) {
            toast.error(getPermissionDeniedMessage("delete suppliers", ["admin"]));
            setIsDeleteDialogOpen(false);
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase
                .from("suppliers")
                .delete()
                .eq("id", selectedSupplier.id);

            if (error) throw error;

            toast.success("Supplier deleted successfully!");
            setIsDeleteDialogOpen(false);
            setSelectedSupplier(null);
            fetchSuppliers();
        } catch (error: any) {
            console.error("Error deleting supplier:", error);
            toast.error(error.message || "Failed to delete supplier");
        } finally {
            setSaving(false);
        }
    }

    function resetForm() {
        setFormData({
            name: "",
            contact_person: "",
            email: "",
            phone: "",
            address: "",
            city: "",
            state: "",
            pincode: "",
            gst_number: "",
            payment_terms: "Net 30",
        });
    }

    function openEditDialog(supplier: Supplier) {
        setSelectedSupplier(supplier);
        setFormData({
            name: supplier.name,
            contact_person: supplier.contact_person || "",
            email: supplier.email || "",
            phone: supplier.phone || "",
            address: supplier.address || "",
            city: supplier.city || "",
            state: supplier.state || "",
            pincode: supplier.pincode || "",
            gst_number: supplier.gst_number || "",
            payment_terms: supplier.payment_terms || "Net 30",
        });
        setIsEditDialogOpen(true);
    }

    function openDeleteDialog(supplier: Supplier) {
        setSelectedSupplier(supplier);
        setIsDeleteDialogOpen(true);
    }

    async function openViewDialog(supplier: Supplier) {
        setSelectedSupplier(supplier);
        setIsViewDialogOpen(true);
        setLoadingBatches(true);
        try {
            const { data, error } = await supabase
                .from("batches")
                .select("id, batch_number, quantity, medicines(name)")
                .eq("supplier_id", supplier.id)
                .order("created_at", { ascending: false })
                .limit(20);
            if (error) throw error;
            setSupplierBatches((data as unknown as Batch[]) || []);
        } catch (error) {
            console.error("Error fetching batches:", error);
            toast.error("Failed to load batches");
        } finally {
            setLoadingBatches(false);
        }
    }

    const filteredSuppliers = suppliers.filter(
        (supplier) =>
            supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            supplier.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            supplier.city?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeSuppliers = suppliers.filter((s) => s.is_active).length;
    const totalBatches = suppliers.reduce((sum, s) => sum + (s.batch_count || 0), 0);

    if (loading) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground mt-4">Loading suppliers...</p>
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
                        <Truck className="w-8 h-8 text-primary" />
                        <GradientText>Suppliers</GradientText>
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage your medicine suppliers</p>
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
                            placeholder="Search suppliers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-64"
                        />
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Supplier
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Add New Supplier</DialogTitle>
                                <DialogDescription>Add a new supplier to your pharmacy network</DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4 py-4">
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="name">Company Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g., MedSupply Co."
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact_person">Contact Person</Label>
                                    <Input
                                        id="contact_person"
                                        placeholder="e.g., John Doe"
                                        value={formData.contact_person}
                                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        placeholder="e.g., +91 9876543210"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="e.g., contact@medsupply.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Textarea
                                        id="address"
                                        placeholder="Street address"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        placeholder="e.g., Mumbai"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="state">State</Label>
                                    <Input
                                        id="state"
                                        placeholder="e.g., Maharashtra"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pincode">Pincode</Label>
                                    <Input
                                        id="pincode"
                                        placeholder="e.g., 400001"
                                        value={formData.pincode}
                                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gst_number">GST Number</Label>
                                    <Input
                                        id="gst_number"
                                        placeholder="e.g., 27AAAAA0000A1Z5"
                                        value={formData.gst_number}
                                        onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="payment_terms">Payment Terms</Label>
                                    <Input
                                        id="payment_terms"
                                        placeholder="e.g., Net 30"
                                        value={formData.payment_terms}
                                        onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddSupplier} disabled={saving}>
                                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Add Supplier
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Total Suppliers</p>
                        <p className="text-2xl font-bold">{suppliers.length}</p>
                    </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Active Suppliers</p>
                        <p className="text-2xl font-bold text-emerald-500">{activeSuppliers}</p>
                    </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Total Batches</p>
                        <p className="text-2xl font-bold">{totalBatches}</p>
                    </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Inactive</p>
                        <p className="text-2xl font-bold text-gray-500">{suppliers.length - activeSuppliers}</p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Suppliers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                    {filteredSuppliers.map((supplier, index) => (
                        <motion.div
                            key={supplier.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <TiltCard>
                                <Card className="glass-card border-white/10 h-full">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <Building className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">{supplier.name}</CardTitle>
                                                    <CardDescription className="flex items-center gap-1">
                                                        <Package className="w-3 h-3" />
                                                        {supplier.batch_count || 0} batches supplied
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <Badge className={supplier.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-500/10 text-gray-500"}>
                                                {supplier.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="space-y-1 text-sm">
                                            {supplier.contact_person && (
                                                <p className="flex items-center gap-2 text-muted-foreground">
                                                    <User className="w-3 h-3" /> {supplier.contact_person}
                                                </p>
                                            )}
                                            {supplier.phone && (
                                                <p className="flex items-center gap-2 text-muted-foreground">
                                                    <Phone className="w-3 h-3" /> {supplier.phone}
                                                </p>
                                            )}
                                            {supplier.city && (
                                                <p className="flex items-center gap-2 text-muted-foreground">
                                                    <MapPin className="w-3 h-3" /> {supplier.city}, {supplier.state}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openViewDialog(supplier)}>
                                                <Eye className="w-3 h-3" /> View
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(supplier)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeleteDialog(supplier)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TiltCard>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredSuppliers.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                    <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{searchQuery ? "No suppliers found" : "No suppliers yet"}</p>
                    <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />Add First Supplier
                    </Button>
                </motion.div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Supplier</DialogTitle>
                        <DialogDescription>Update supplier details</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="col-span-2 space-y-2">
                            <Label>Company Name *</Label>
                            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Contact Person</Label>
                            <Input value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label>Email</Label>
                            <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label>Address</Label>
                            <Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>City</Label>
                            <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>State</Label>
                            <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Pincode</Label>
                            <Input value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>GST Number</Label>
                            <Input value={formData.gst_number} onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })} />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label>Payment Terms</Label>
                            <Input value={formData.payment_terms} onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditSupplier} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Supplier</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedSupplier?.name}"?
                            {(selectedSupplier?.batch_count || 0) > 0 && (
                                <span className="block mt-2 text-amber-500">
                                    ⚠️ This supplier has {selectedSupplier?.batch_count} batches. They will be unlinked.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteSupplier} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle>{selectedSupplier?.name}</DialogTitle>
                                <DialogDescription>Supplier details and recent batches</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto py-4 space-y-4">
                        {/* Supplier Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {selectedSupplier?.contact_person && (
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span>{selectedSupplier.contact_person}</span>
                                </div>
                            )}
                            {selectedSupplier?.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span>{selectedSupplier.phone}</span>
                                </div>
                            )}
                            {selectedSupplier?.email && (
                                <div className="flex items-center gap-2 col-span-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <span>{selectedSupplier.email}</span>
                                </div>
                            )}
                            {selectedSupplier?.address && (
                                <div className="flex items-start gap-2 col-span-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                    <span>{selectedSupplier.address}, {selectedSupplier.city}, {selectedSupplier.state} - {selectedSupplier.pincode}</span>
                                </div>
                            )}
                            {selectedSupplier?.gst_number && (
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                                    <span>GST: {selectedSupplier.gst_number}</span>
                                </div>
                            )}
                            {selectedSupplier?.payment_terms && (
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-muted-foreground" />
                                    <span>Terms: {selectedSupplier.payment_terms}</span>
                                </div>
                            )}
                        </div>

                        {/* Recent Batches */}
                        <div className="pt-4 border-t">
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4" /> Recent Batches ({supplierBatches.length})
                            </h4>
                            {loadingBatches ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : supplierBatches.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">No batches from this supplier</p>
                            ) : (
                                <div className="space-y-2">
                                    {supplierBatches.map((batch) => (
                                        <div key={batch.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                                            <div>
                                                <p className="font-medium">{batch.medicines?.name || "Unknown"}</p>
                                                <p className="text-xs text-muted-foreground">Batch: {batch.batch_number}</p>
                                            </div>
                                            <Badge>{batch.quantity} units</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
