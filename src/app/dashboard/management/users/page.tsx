"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    Users,
    Plus,
    Edit,
    Trash2,
    Loader2,
    Search,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Mail,
    Phone,
    User as UserIcon,
    Crown,
    Eye,
    EyeOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { PermissionDenied, hasPermission, getPermissionDeniedMessage, UserRole } from "@/lib/permissions";

interface User {
    id: string;
    email: string;
    name: string;
    role: "admin" | "pharmacist" | "staff";
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
    is_active?: boolean;
}

const roleConfig = {
    admin: { label: "Admin", color: "bg-purple-500/10 text-purple-500", icon: Crown, description: "Full access" },
    pharmacist: { label: "Pharmacist", color: "bg-blue-500/10 text-blue-500", icon: ShieldCheck, description: "Can manage inventory & sales" },
    staff: { label: "Staff", color: "bg-gray-500/10 text-gray-500", icon: Shield, description: "Limited access" },
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
        phone: "",
        role: "staff" as "admin" | "pharmacist" | "staff",
    });
    const [saving, setSaving] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const isAdmin = currentUser?.role === "admin";

    const supabase = createClient();

    useEffect(() => {
        fetchCurrentUser();
        fetchUsers();
    }, []);

    async function fetchCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();
            if (data) setCurrentUser(data);
        }
    }

    async function fetchUsers() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    }

    async function handleAddUser() {
        if (!formData.email.trim() || !formData.password || !formData.name.trim()) {
            toast.error("Please fill in all required fields");
            return;
        }

        if (formData.password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        try {
            setSaving(true);

            // Create auth user using supabase admin API would require server-side
            // For now, we'll just add to profiles if auth user already exists
            // In production, this should be a server action

            const { data: existingUser } = await supabase
                .from("profiles")
                .select("id")
                .eq("email", formData.email.toLowerCase())
                .single();

            if (existingUser) {
                toast.error("A user with this email already exists");
                return;
            }

            // Note: In production, you'd use Supabase Admin API to create auth users
            // For now, show info message
            toast.info("To add new users, they need to sign up first. Then you can update their role here.");
            setIsAddDialogOpen(false);
            resetForm();
        } catch (error: any) {
            console.error("Error adding user:", error);
            toast.error(error.message || "Failed to add user");
        } finally {
            setSaving(false);
        }
    }

    async function handleEditUser() {
        if (!selectedUser || !formData.name.trim()) return;

        try {
            setSaving(true);
            const { error } = await supabase
                .from("profiles")
                .update({
                    name: formData.name.trim(),
                    phone: formData.phone.trim() || null,
                    role: formData.role,
                } as any)
                .eq("id", selectedUser.id);

            if (error) throw error;

            toast.success("User updated successfully!");
            setIsEditDialogOpen(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error: any) {
            console.error("Error updating user:", error);
            toast.error(error.message || "Failed to update user");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteUser() {
        if (!selectedUser) return;

        try {
            setSaving(true);
            // In production, you'd also delete from auth.users
            const { error } = await supabase
                .from("profiles")
                .delete()
                .eq("id", selectedUser.id);

            if (error) throw error;

            toast.success("User deleted successfully!");
            setIsDeleteDialogOpen(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error: any) {
            console.error("Error deleting user:", error);
            toast.error(error.message || "Failed to delete user");
        } finally {
            setSaving(false);
        }
    }

    function resetForm() {
        setFormData({
            email: "",
            password: "",
            name: "",
            phone: "",
            role: "staff",
        });
    }

    function openEditDialog(user: User) {
        setSelectedUser(user);
        setFormData({
            email: user.email,
            password: "",
            name: user.name,
            phone: user.phone || "",
            role: user.role,
        });
        setIsEditDialogOpen(true);
    }

    function openDeleteDialog(user: User) {
        setSelectedUser(user);
        setIsDeleteDialogOpen(true);
    }

    const filteredUsers = users.filter(
        (user) =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const adminCount = users.filter((u) => u.role === "admin").length;
    const pharmacistCount = users.filter((u) => u.role === "pharmacist").length;
    const staffCount = users.filter((u) => u.role === "staff").length;

    if (loading) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground mt-4">Loading users...</p>
                </div>
            </div>
        );
    }

    // Permission check - only admin can access Users management
    if (!isAdmin) {
        return (
            <PermissionDenied
                userRole={currentUser?.role as UserRole}
                requiredRoles={["admin"]}
                feature="manage users"
            />
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" />
                        <GradientText>Users</GradientText>
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage pharmacy staff and roles</p>
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
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-64"
                        />
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2" disabled={!isAdmin}>
                                <Plus className="w-4 h-4" />
                                Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                                <DialogDescription>Create a new user account for pharmacy staff</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Full Name *</Label>
                                    <Input
                                        placeholder="e.g., John Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email *</Label>
                                    <Input
                                        type="email"
                                        placeholder="e.g., john@pharmacy.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password *</Label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Min 6 characters"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input
                                        placeholder="e.g., +91 9876543210"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select value={formData.role} onValueChange={(v: "admin" | "pharmacist" | "staff") => setFormData({ ...formData, role: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">
                                                <div className="flex items-center gap-2">
                                                    <Crown className="w-4 h-4 text-purple-500" />
                                                    Admin - Full access
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="pharmacist">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                                                    Pharmacist - Inventory & Sales
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="staff">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="w-4 h-4 text-gray-500" />
                                                    Staff - Limited access
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddUser} disabled={saving}>
                                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Add User
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
                        <p className="text-sm text-muted-foreground">Total Users</p>
                        <p className="text-2xl font-bold">{users.length}</p>
                    </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Crown className="w-5 h-5 text-purple-500" />
                        <div>
                            <p className="text-sm text-muted-foreground">Admins</p>
                            <p className="text-2xl font-bold">{adminCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4 flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-blue-500" />
                        <div>
                            <p className="text-sm text-muted-foreground">Pharmacists</p>
                            <p className="text-2xl font-bold">{pharmacistCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Shield className="w-5 h-5 text-gray-500" />
                        <div>
                            <p className="text-sm text-muted-foreground">Staff</p>
                            <p className="text-2xl font-bold">{staffCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                    {filteredUsers.map((user, index) => {
                        const config = roleConfig[user.role] || roleConfig.staff;
                        const RoleIcon = config.icon;
                        return (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <TiltCard>
                                    <Card className="glass-card border-white/10 h-full overflow-hidden">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold shrink-0">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <CardTitle className="text-lg truncate">{user.name}</CardTitle>
                                                    <CardDescription className="flex items-center gap-1 truncate">
                                                        <Mail className="w-3 h-3 shrink-0" />
                                                        <span className="truncate">{user.email}</span>
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <Badge className={`${config.color} w-fit`}>
                                                <RoleIcon className="w-3 h-3 mr-1" />
                                                {config.label}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="text-sm text-muted-foreground">
                                                {user.phone && (
                                                    <p className="flex items-center gap-2">
                                                        <Phone className="w-3 h-3" /> {user.phone}
                                                    </p>
                                                )}
                                                <p className="text-xs mt-2">
                                                    Joined {new Date(user.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                {isAdmin && (
                                                    <>
                                                        <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEditDialog(user)}>
                                                            <Edit className="w-3 h-3" /> Edit
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeleteDialog(user)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                {!isAdmin && (
                                                    <p className="text-xs text-muted-foreground w-full text-center">Only admins can edit users</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TiltCard>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {filteredUsers.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{searchQuery ? "No users found" : "No users yet"}</p>
                </motion.div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>Update user details and role</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Full Name *</Label>
                            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Email (read-only)</Label>
                            <Input value={formData.email} disabled className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={formData.role} onValueChange={(v: "admin" | "pharmacist" | "staff") => setFormData({ ...formData, role: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">
                                        <div className="flex items-center gap-2">
                                            <Crown className="w-4 h-4 text-purple-500" />Admin
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="pharmacist">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-blue-500" />Pharmacist
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="staff">
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-gray-500" />Staff
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditUser} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedUser?.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteUser} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
