"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Lock, Crown, ShieldCheck, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export type UserRole = "admin" | "pharmacist" | "staff";

// Define permissions for each feature
export const PERMISSIONS = {
    // User Management
    VIEW_USERS: ["admin"],
    ADD_USERS: ["admin"],
    EDIT_USERS: ["admin"],
    DELETE_USERS: ["admin"],

    // Inventory Management
    VIEW_INVENTORY: ["admin", "pharmacist", "staff"],
    ADD_MEDICINE: ["admin", "pharmacist"],
    EDIT_MEDICINE: ["admin", "pharmacist"],
    DELETE_MEDICINE: ["admin"],
    ADD_BATCH: ["admin", "pharmacist"],
    EDIT_BATCH: ["admin", "pharmacist"],
    DELETE_BATCH: ["admin"],

    // Sales
    VIEW_SALES: ["admin", "pharmacist", "staff"],
    MAKE_SALE: ["admin", "pharmacist", "staff"],
    VIEW_SALES_HISTORY: ["admin", "pharmacist"],
    REFUND_SALE: ["admin"],

    // Suppliers
    VIEW_SUPPLIERS: ["admin", "pharmacist"],
    ADD_SUPPLIER: ["admin"],
    EDIT_SUPPLIER: ["admin"],
    DELETE_SUPPLIER: ["admin"],

    // Categories
    VIEW_CATEGORIES: ["admin", "pharmacist", "staff"],
    ADD_CATEGORY: ["admin"],
    EDIT_CATEGORY: ["admin"],
    DELETE_CATEGORY: ["admin"],

    // Analytics & Forecasting
    VIEW_ANALYTICS: ["admin", "pharmacist"],
    VIEW_FORECASTING: ["admin", "pharmacist"],

    // Alerts
    VIEW_ALERTS: ["admin", "pharmacist", "staff"],
    RESOLVE_ALERTS: ["admin", "pharmacist"],

    // Settings
    VIEW_SETTINGS: ["admin", "pharmacist", "staff"],
    EDIT_SETTINGS: ["admin"],

    // AI Assistant
    USE_ASSISTANT: ["admin", "pharmacist"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// Check if user has permission
export function hasPermission(userRole: UserRole | undefined | null, permission: Permission): boolean {
    if (!userRole) return false;
    return (PERMISSIONS[permission] as readonly string[]).includes(userRole);
}

// Get role display info
export function getRoleInfo(role: UserRole) {
    switch (role) {
        case "admin":
            return {
                label: "Admin",
                description: "Full access to all features",
                icon: Crown,
                color: "text-purple-500",
                bgColor: "bg-purple-500/10",
            };
        case "pharmacist":
            return {
                label: "Pharmacist",
                description: "Manage inventory, sales, and alerts",
                icon: ShieldCheck,
                color: "text-blue-500",
                bgColor: "bg-blue-500/10",
            };
        case "staff":
            return {
                label: "Staff",
                description: "Basic sales and view access",
                icon: Shield,
                color: "text-gray-500",
                bgColor: "bg-gray-500/10",
            };
    }
}

// Permission denied message component
interface PermissionDeniedProps {
    userRole?: UserRole | null;
    requiredRoles: UserRole[];
    feature: string;
    showBackButton?: boolean;
}

export function PermissionDenied({
    userRole,
    requiredRoles,
    feature,
    showBackButton = true
}: PermissionDeniedProps) {
    const currentRoleInfo = userRole ? getRoleInfo(userRole) : null;

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="max-w-md w-full"
            >
                <Card className="glass-card border-destructive/30 overflow-hidden">
                    <CardContent className="p-8 text-center">
                        {/* Animated lock icon */}
                        <motion.div
                            initial={{ rotate: -10 }}
                            animate={{ rotate: [0, -10, 10, -10, 0] }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center"
                        >
                            <Lock className="w-10 h-10 text-destructive" />
                        </motion.div>

                        <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
                        <p className="text-muted-foreground mb-6">
                            You don't have permission to {feature}.
                        </p>

                        {/* Current role */}
                        {currentRoleInfo && (
                            <div className={`${currentRoleInfo.bgColor} rounded-lg p-4 mb-4`}>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <currentRoleInfo.icon className={`w-4 h-4 ${currentRoleInfo.color}`} />
                                    <span className={`font-medium ${currentRoleInfo.color}`}>
                                        Your Role: {currentRoleInfo.label}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {currentRoleInfo.description}
                                </p>
                            </div>
                        )}

                        {/* Required roles */}
                        <div className="bg-muted/50 rounded-lg p-4 mb-6">
                            <p className="text-sm text-muted-foreground mb-2">
                                Required role{requiredRoles.length > 1 ? 's' : ''}:
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {requiredRoles.map((role) => {
                                    const roleInfo = getRoleInfo(role);
                                    return (
                                        <span
                                            key={role}
                                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${roleInfo.bgColor} ${roleInfo.color}`}
                                        >
                                            <roleInfo.icon className="w-3 h-3" />
                                            {roleInfo.label}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-3">
                            {showBackButton && (
                                <Button variant="outline" asChild>
                                    <Link href="/dashboard" className="gap-2">
                                        <ArrowLeft className="w-4 h-4" />
                                        Back to Dashboard
                                    </Link>
                                </Button>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Contact your administrator to request access.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

// Higher-order component for protected content
interface ProtectedContentProps {
    userRole?: UserRole | null;
    permission: Permission;
    feature: string;
    children: ReactNode;
    fallback?: ReactNode;
}

export function ProtectedContent({
    userRole,
    permission,
    feature,
    children,
    fallback,
}: ProtectedContentProps) {
    if (!hasPermission(userRole, permission)) {
        if (fallback) {
            return <>{fallback}</>;
        }
        return (
            <PermissionDenied
                userRole={userRole}
                requiredRoles={[...PERMISSIONS[permission]] as UserRole[]}
                feature={feature}
            />
        );
    }

    return <>{children}</>;
}

// Toast message for permission denied actions
export function getPermissionDeniedMessage(action: string, requiredRoles: UserRole[]): string {
    const roleNames = requiredRoles.map(r => getRoleInfo(r).label).join(" or ");
    return `You need ${roleNames} access to ${action}. Contact your administrator.`;
}
