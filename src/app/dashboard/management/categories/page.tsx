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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { GradientText, TiltCard } from "@/components/ui/animated";
import {
    FolderOpen,
    Plus,
    Edit,
    Trash2,
    Loader2,
    Pill,
    Search,
    MoreVertical,
    Check,
    Eye,
    Package,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { hasPermission, getPermissionDeniedMessage, UserRole } from "@/lib/permissions";

interface Category {
    id: string;
    name: string;
    description: string | null;
    color: string;
    icon: string;
    created_at: string;
    medicine_count?: number;
}

interface Medicine {
    id: string;
    name: string;
    reorder_level: number;
    batches: { quantity: number }[];
}

const colorOptions = [
    { value: "bg-red-500", label: "Red" },
    { value: "bg-blue-500", label: "Blue" },
    { value: "bg-green-500", label: "Green" },
    { value: "bg-amber-500", label: "Amber" },
    { value: "bg-purple-500", label: "Purple" },
    { value: "bg-pink-500", label: "Pink" },
    { value: "bg-cyan-500", label: "Cyan" },
    { value: "bg-emerald-500", label: "Emerald" },
    { value: "bg-rose-500", label: "Rose" },
    { value: "bg-gray-500", label: "Gray" },
];

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [categoryMedicines, setCategoryMedicines] = useState<Medicine[]>([]);
    const [loadingMedicines, setLoadingMedicines] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        color: "bg-blue-500",
    });
    const [saving, setSaving] = useState(false);
    const [userRole, setUserRole] = useState<UserRole | null>(null);

    const supabase = createClient();

    useEffect(() => {
        fetchCategories();
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

    async function fetchCategories() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("categories")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;

            // Get medicine counts for each category
            const categoriesWithCounts = await Promise.all(
                (data || []).map(async (cat) => {
                    const { count } = await supabase
                        .from("medicines")
                        .select("*", { count: "exact", head: true })
                        .eq("category_id", cat.id);
                    return { ...cat, medicine_count: count || 0 };
                })
            );

            setCategories(categoriesWithCounts);
        } catch (error) {
            console.error("Error fetching categories:", error);
            toast.error("Failed to load categories");
        } finally {
            setLoading(false);
        }
    }

    async function handleAddCategory() {
        // Permission check - only admin can add categories
        if (!hasPermission(userRole, "ADD_CATEGORY")) {
            toast.error(getPermissionDeniedMessage("add categories", ["admin"]));
            return;
        }

        if (!formData.name.trim()) {
            toast.error("Category name is required");
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase.from("categories").insert({
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                color: formData.color,
                icon: "pill",
            });

            if (error) throw error;

            toast.success("Category added successfully!");
            setIsAddDialogOpen(false);
            setFormData({ name: "", description: "", color: "bg-blue-500" });
            fetchCategories();
        } catch (error: any) {
            console.error("Error adding category:", error);
            toast.error(error.message || "Failed to add category");
        } finally {
            setSaving(false);
        }
    }

    async function handleEditCategory() {
        if (!selectedCategory || !formData.name.trim()) return;

        // Permission check - only admin can edit categories
        if (!hasPermission(userRole, "EDIT_CATEGORY")) {
            toast.error(getPermissionDeniedMessage("edit categories", ["admin"]));
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase
                .from("categories")
                .update({
                    name: formData.name.trim(),
                    description: formData.description.trim() || null,
                    color: formData.color,
                })
                .eq("id", selectedCategory.id);

            if (error) throw error;

            toast.success("Category updated successfully!");
            setIsEditDialogOpen(false);
            setSelectedCategory(null);
            fetchCategories();
        } catch (error: any) {
            console.error("Error updating category:", error);
            toast.error(error.message || "Failed to update category");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteCategory() {
        if (!selectedCategory) return;

        // Permission check - only admin can delete categories
        if (!hasPermission(userRole, "DELETE_CATEGORY")) {
            toast.error(getPermissionDeniedMessage("delete categories", ["admin"]));
            setIsDeleteDialogOpen(false);
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase
                .from("categories")
                .delete()
                .eq("id", selectedCategory.id);

            if (error) throw error;

            toast.success("Category deleted successfully!");
            setIsDeleteDialogOpen(false);
            setSelectedCategory(null);
            fetchCategories();
        } catch (error: any) {
            console.error("Error deleting category:", error);
            toast.error(error.message || "Failed to delete category");
        } finally {
            setSaving(false);
        }
    }

    function openEditDialog(category: Category) {
        setSelectedCategory(category);
        setFormData({
            name: category.name,
            description: category.description || "",
            color: category.color,
        });
        setIsEditDialogOpen(true);
    }

    function openDeleteDialog(category: Category) {
        setSelectedCategory(category);
        setIsDeleteDialogOpen(true);
    }

    async function openViewDialog(category: Category) {
        setSelectedCategory(category);
        setIsViewDialogOpen(true);
        setLoadingMedicines(true);
        try {
            const { data, error } = await supabase
                .from("medicines")
                .select("id, name, reorder_level, batches(quantity)")
                .eq("category_id", category.id)
                .order("name", { ascending: true });
            if (error) throw error;
            setCategoryMedicines(data || []);
        } catch (error) {
            console.error("Error fetching medicines:", error);
            toast.error("Failed to load medicines");
        } finally {
            setLoadingMedicines(false);
        }
    }

    const filteredCategories = categories.filter(
        (cat) =>
            cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground mt-4">Loading categories...</p>
                </div>
            </div>
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
                        <FolderOpen className="w-8 h-8 text-primary" />
                        <GradientText>Categories</GradientText>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Organize your medicines by category
                    </p>
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
                            placeholder="Search categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-64"
                        />
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Category
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Category</DialogTitle>
                                <DialogDescription>
                                    Create a new category to organize your medicines
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Category Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g., Painkillers"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Brief description of this category"
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Color</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {colorOptions.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() =>
                                                    setFormData({ ...formData, color: color.value })
                                                }
                                                className={`w-8 h-8 rounded-full ${color.value} flex items-center justify-center transition-transform hover:scale-110 ${formData.color === color.value ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                                            >
                                                {formData.color === color.value && (
                                                    <Check className="w-4 h-4 text-white" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAddDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleAddCategory} disabled={saving}>
                                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Add Category
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
                        <p className="text-sm text-muted-foreground">Total Categories</p>
                        <p className="text-2xl font-bold">{categories.length}</p>
                    </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Active Categories</p>
                        <p className="text-2xl font-bold">
                            {categories.filter((c) => (c.medicine_count || 0) > 0).length}
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Total Medicines</p>
                        <p className="text-2xl font-bold">
                            {categories.reduce((sum, c) => sum + (c.medicine_count || 0), 0)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Uncategorized</p>
                        <p className="text-2xl font-bold text-amber-500">0</p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                    {filteredCategories.map((category, index) => (
                        <motion.div
                            key={category.id}
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
                                                <div
                                                    className={`w-10 h-10 rounded-lg ${category.color} flex items-center justify-center`}
                                                >
                                                    <Pill className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">
                                                        {category.name}
                                                    </CardTitle>
                                                    <CardDescription>
                                                        {category.medicine_count || 0} medicines
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => openEditDialog(category)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive"
                                                    onClick={() => openDeleteDialog(category)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {category.description || "No description"}
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full gap-2"
                                            onClick={() => openViewDialog(category)}
                                        >
                                            <Eye className="w-4 h-4" />
                                            View Medicines
                                        </Button>
                                    </CardContent>
                                </Card>
                            </TiltCard>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredCategories.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                >
                    <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                        {searchQuery ? "No categories found" : "No categories yet"}
                    </p>
                    <Button
                        className="mt-4"
                        onClick={() => setIsAddDialogOpen(true)}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Category
                    </Button>
                </motion.div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                        <DialogDescription>
                            Update category details
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Category Name *</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex flex-wrap gap-2">
                                {colorOptions.map((color) => (
                                    <button
                                        key={color.value}
                                        onClick={() =>
                                            setFormData({ ...formData, color: color.value })
                                        }
                                        className={`w-8 h-8 rounded-full ${color.value} flex items-center justify-center transition-transform hover:scale-110 ${formData.color === color.value ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                                    >
                                        {formData.color === color.value && (
                                            <Check className="w-4 h-4 text-white" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleEditCategory} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Category</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedCategory?.name}"?
                            {(selectedCategory?.medicine_count || 0) > 0 && (
                                <span className="block mt-2 text-amber-500">
                                    ⚠️ This category has {selectedCategory?.medicine_count} medicines.
                                    They will become uncategorized.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteCategory}
                            disabled={saving}
                        >
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Medicines Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${selectedCategory?.color} flex items-center justify-center`}>
                                <Pill className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle>{selectedCategory?.name}</DialogTitle>
                                <DialogDescription>
                                    {categoryMedicines.length} medicines in this category
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto py-4">
                        {loadingMedicines ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : categoryMedicines.length === 0 ? (
                            <div className="text-center py-8">
                                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No medicines in this category</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {categoryMedicines.map((medicine) => {
                                    const totalStock = medicine.batches?.reduce((sum, b) => sum + (b.quantity || 0), 0) || 0;
                                    const isLowStock = totalStock < medicine.reorder_level;
                                    const isOutOfStock = totalStock === 0;
                                    return (
                                        <motion.div
                                            key={medicine.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Pill className="w-4 h-4 text-muted-foreground" />
                                                <span className="font-medium">{medicine.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">
                                                    {totalStock} units
                                                </span>
                                                <Badge className={
                                                    isOutOfStock ? "bg-red-500/10 text-red-500" :
                                                        isLowStock ? "bg-amber-500/10 text-amber-500" :
                                                            "bg-emerald-500/10 text-emerald-500"
                                                }>
                                                    {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                                                </Badge>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
