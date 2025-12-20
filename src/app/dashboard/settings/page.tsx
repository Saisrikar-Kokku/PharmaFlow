"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { GradientText } from "@/components/ui/animated";
import {
    Settings,
    User,
    Bell,
    Shield,
    Mail,
    Phone,
    Loader2,
    Lock,
    Globe,
    Camera,
    Smartphone
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useUser } from "@/hooks/use-supabase";

// Profile Schema
const profileFormSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    phone: z.string().optional(),
    email: z.string().email().optional(), // Read-only but included in schema
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function SettingsPage() {
    const { profile, loading: profileLoading, refreshProfile } = useUser();
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Initialize form
    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: "",
            phone: "",
            email: "",
        },
        mode: "onChange",
    });

    // Update form when profile loads
    useEffect(() => {
        if (profile) {
            form.reset({
                name: profile.name || "",
                phone: profile.phone || "",
                email: profile.email || "",
            });
        }
    }, [profile, form]);

    const supabase = createClient();

    async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
        if (!event.target.files || event.target.files.length === 0 || !profile) {
            return;
        }

        try {
            setUploadingAvatar(true);
            const file = event.target.files[0];
            const fileExt = file.name.split(".").pop();
            const filePath = `${profile.id}-${Math.random()}.${fileExt}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file);

            if (uploadError) {
                if (uploadError.message.includes("Bucket not found")) {
                    // Try to create standard bucket if missing (unlikely in prod but good for dev)
                    // In real app, buckets should be created via SQL/Dashboard
                    throw new Error("Storage bucket 'avatars' not found. Please contact admin.");
                }
                throw uploadError;
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);

            // 3. Update Profile
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: publicUrl } as any)
                .eq("id", profile.id);

            if (updateError) throw updateError;

            toast.success("Avatar updated successfully!");
            refreshProfile();
        } catch (error: any) {
            console.error("Error uploading avatar:", error);
            toast.error(error.message || "Failed to upload avatar");
        } finally {
            setUploadingAvatar(false);
        }
    }

    async function onSubmit(data: ProfileFormValues) {
        if (!profile) return;

        try {
            setSaving(true);
            const { error } = await supabase
                .from("profiles")
                .update({
                    name: data.name,
                    phone: data.phone || null,
                } as any)
                .eq("id", profile.id);

            if (error) throw error;

            toast.success("Profile updated successfully");
            refreshProfile();
        } catch (error: any) {
            console.error("Error updating profile:", error);
            toast.error(error.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    }

    async function handlePreferenceChange(key: string, value: boolean) {
        if (!profile) return;

        try {
            const currentPreferences = (profile.preferences as any) || {};
            const currentNotifications = currentPreferences.notifications || {};

            const updatedPreferences = {
                ...currentPreferences,
                notifications: {
                    ...currentNotifications,
                    [key]: value
                }
            };

            const { error } = await supabase
                .from("profiles")
                .update({ preferences: updatedPreferences } as any)
                .eq("id", profile.id);

            if (error) throw error;

            // Optimistically update local state via refresh
            refreshProfile();
            toast.success("Preference updated");
        } catch (error: any) {
            console.error("Error updating preference:", error);
            toast.error("Failed to update preference");
        }
    }

    async function handleTestAlerts() {
        try {
            toast.info("Triggering daily alert check...");
            const response = await fetch('/api/jobs/daily-alerts');
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Failed to run check");

            if (result.success) {
                toast.success(result.message);
            } else {
                toast.info(result.message); // e.g. "No critical alerts"
            }
        } catch (error: any) {
            console.error("Error testing alerts:", error);
            toast.error(error.message || "Failed to test alerts");
        }
    }

    async function handlePasswordReset() {
        if (!profile?.email) return;

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
                redirectTo: `${window.location.origin}/auth/update-password`,
            });
            if (error) throw error;
            toast.success("Password reset email sent!");
        } catch (error: any) {
            toast.error(error.message || "Failed to send reset email");
        }
    }

    if (profileLoading) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground mt-4">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 border-b border-border/50 pb-6"
            >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-pharma-emerald/20 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Manage your account preferences and profile</p>
                </div>
            </motion.div>

            <Tabs defaultValue="profile" className="flex flex-col lg:flex-row gap-8">
                <aside className="lg:w-64 flex-shrink-0">
                    <TabsList className="flex-col w-full h-auto bg-transparent gap-2 p-0">
                        <TabsTrigger
                            value="profile"
                            className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg transition-all"
                        >
                            <User className="w-4 h-4" /> Profile
                        </TabsTrigger>
                        <TabsTrigger
                            value="notifications"
                            className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg transition-all"
                        >
                            <Bell className="w-4 h-4" /> Notifications
                        </TabsTrigger>
                        <TabsTrigger
                            value="security"
                            className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg transition-all"
                        >
                            <Shield className="w-4 h-4" /> Security
                        </TabsTrigger>
                    </TabsList>
                </aside>

                <div className="flex-1">
                    {/* Profile Tab */}
                    <TabsContent value="profile" className="mt-0">
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <Card className="glass-card border-white/10">
                                <CardHeader>
                                    <CardTitle>Personal Information</CardTitle>
                                    <CardDescription>Update your public profile details and contact info.</CardDescription>
                                </CardHeader>
                                <Separator className="mb-6 opacity-20" />
                                <CardContent>
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                            <div className="flex flex-col md:flex-row gap-8">
                                                {/* Left Column - Avatar */}
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="relative group cursor-pointer" onClick={() => document.getElementById("avatar-upload")?.click()}>
                                                        <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                                                            <AvatarImage src={profile?.avatar_url || ""} />
                                                            <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-blue-600 text-white">
                                                                {profile?.name?.charAt(0).toUpperCase() || "U"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Camera className="w-8 h-8 text-white" />
                                                        </div>
                                                        {uploadingAvatar && (
                                                            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input
                                                        id="avatar-upload"
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleAvatarUpload}
                                                        disabled={uploadingAvatar}
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        type="button"
                                                        className="w-full"
                                                        onClick={() => document.getElementById("avatar-upload")?.click()}
                                                        disabled={uploadingAvatar}
                                                    >
                                                        {uploadingAvatar ? "Uploading..." : "Change Avatar"}
                                                    </Button>
                                                </div>

                                                {/* Right Column - Form Fields */}
                                                <div className="flex-1 space-y-6 max-w-lg">
                                                    <FormField
                                                        control={form.control}
                                                        name="name"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Full Name</FormLabel>
                                                                <FormControl>
                                                                    <div className="relative">
                                                                        <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                                                        <Input placeholder="John Doe" className="pl-9" {...field} />
                                                                    </div>
                                                                </FormControl>
                                                                <FormDescription>
                                                                    This is your public display name.
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <FormField
                                                            control={form.control}
                                                            name="email"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Email</FormLabel>
                                                                    <FormControl>
                                                                        <div className="relative">
                                                                            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                                                            <Input {...field} disabled className="pl-9 bg-muted/50" />
                                                                        </div>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <FormField
                                                            control={form.control}
                                                            name="phone"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Phone Number</FormLabel>
                                                                    <FormControl>
                                                                        <div className="relative">
                                                                            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                                                            <Input placeholder="+1 234 567 890" className="pl-9" {...field} />
                                                                        </div>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>

                                                    <div className="flex justify-end pt-4">
                                                        <Button type="submit" disabled={saving} className="min-w-[120px]">
                                                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                            Save Changes
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    {/* Notifications Tab */}
                    <TabsContent value="notifications" className="mt-0">
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <Card className="glass-card border-white/10">
                                <CardHeader>
                                    <CardTitle>Notification Preferences</CardTitle>
                                    <CardDescription>Choose how you receive updates and alerts.</CardDescription>
                                </CardHeader>
                                <Separator className="mb-6 opacity-20" />
                                <CardContent className="space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Communication Channels</h3>
                                        <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-full bg-primary/10">
                                                    <Smartphone className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Push Notifications</p>
                                                    <p className="text-sm text-muted-foreground">Receive notifications on your device</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={(profile?.preferences as any)?.notifications?.push ?? true}
                                                onCheckedChange={(checked) => handlePreferenceChange('push', checked)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-full bg-primary/10">
                                                    <Mail className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Email Alerts</p>
                                                    <p className="text-sm text-muted-foreground">Receive critical alerts via email</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={(profile?.preferences as any)?.notifications?.email ?? true}
                                                onCheckedChange={(checked) => handlePreferenceChange('email', checked)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Alert Types</h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between py-2">
                                                <div className="space-y-0.5">
                                                    <p className="font-medium">Low Stock Warnings</p>
                                                    <p className="text-sm text-muted-foreground">Get notified when stock levels fall below threshold</p>
                                                </div>
                                                <Switch
                                                    checked={(profile?.preferences as any)?.notifications?.low_stock ?? true}
                                                    onCheckedChange={(checked) => handlePreferenceChange('low_stock', checked)}
                                                />
                                            </div>
                                            <Separator className="opacity-10" />
                                            <div className="flex items-center justify-between py-2">
                                                <div className="space-y-0.5">
                                                    <p className="font-medium">Expiry Notifications</p>
                                                    <p className="text-sm text-muted-foreground">Get notified about expiring medicines (30 days prior)</p>
                                                </div>
                                                <Switch
                                                    checked={(profile?.preferences as any)?.notifications?.expiry ?? true}
                                                    onCheckedChange={(checked) => handlePreferenceChange('expiry', checked)}
                                                />
                                            </div>
                                            <Separator className="opacity-10" />
                                            <div className="flex items-center justify-between py-2">
                                                <div className="space-y-0.5">
                                                    <p className="font-medium">New Order Activity</p>
                                                    <p className="text-sm text-muted-foreground">Updates on sales and new batch additions</p>
                                                </div>
                                                <Switch
                                                    checked={(profile?.preferences as any)?.notifications?.updates ?? false}
                                                    onCheckedChange={(checked) => handlePreferenceChange('updates', checked)}
                                                />
                                            </div>

                                            <Separator className="opacity-10 my-4" />

                                            <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 rounded-full bg-primary/10">
                                                        <Shield className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">Test Admin Alerts</p>
                                                        <p className="text-sm text-muted-foreground">Manually trigger the daily inventory health check email</p>
                                                    </div>
                                                </div>
                                                <Button onClick={handleTestAlerts} variant="default" size="sm">
                                                    Run Check Now
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security" className="mt-0">
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <Card className="glass-card border-white/10">
                                <CardHeader>
                                    <CardTitle>Security Settings</CardTitle>
                                    <CardDescription>Manage your password and account security measures.</CardDescription>
                                </CardHeader>
                                <Separator className="mb-6 opacity-20" />
                                <CardContent className="space-y-6">
                                    <div className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-full bg-primary/10">
                                                    <Lock className="w-6 h-6 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-lg">Password</p>
                                                    <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                                                </div>
                                            </div>
                                            <Button variant="outline" onClick={handlePasswordReset}>Change Password</Button>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-full bg-primary/10">
                                                    <Globe className="w-6 h-6 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-lg">Active Sessions</p>
                                                    <p className="text-sm text-muted-foreground">Windows PC - Chrome - Currently Active</p>
                                                </div>
                                            </div>
                                            <Button variant="outline" className="text-destructive hover:text-destructive">Sign Out Other Devices</Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
