"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GradientText } from "@/components/ui/animated";
import { useUser } from "@/hooks/use-supabase";
import {
    Pill,
    LayoutDashboard,
    Package,
    ShoppingCart,
    Bell,
    TrendingUp,
    Bot,
    BarChart3,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Users,
    Truck,
    AlertTriangle,
    Calendar,
    Menu,
    X,
} from "lucide-react";

interface NavItem {
    title: string;
    href: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
}

const mainNavItems: NavItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Inventory", href: "/dashboard/inventory", icon: Package },
    { title: "Sales", href: "/dashboard/sales", icon: ShoppingCart },
    { title: "Alerts", href: "/dashboard/alerts", icon: Bell, badge: 5, badgeColor: "bg-red-500" },
    { title: "Forecasting", href: "/dashboard/forecasting", icon: TrendingUp },
    { title: "Assistant", href: "/dashboard/assistant", icon: Bot },
    { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

const managementNavItemsBase: Omit<NavItem, 'badge'>[] = [
    { title: "Categories", href: "/dashboard/management/categories", icon: Calendar },
    { title: "Suppliers", href: "/dashboard/management/suppliers", icon: Truck },
    { title: "Users", href: "/dashboard/management/users", icon: Users },
];

interface DashboardSidebarProps {
    children?: React.ReactNode;
}

export function DashboardSidebar({ children }: DashboardSidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [expiringCount, setExpiringCount] = useState(0);
    const { signOut, profile } = useUser();
    const supabase = createClient();

    // Fetch real-time expiring count
    useEffect(() => {
        async function fetchExpiringCount() {
            const today = new Date();
            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + 30);

            const { count } = await supabase
                .from("batches")
                .select("*", { count: "exact", head: true })
                .lte("expiry_date", futureDate.toISOString().split("T")[0])
                .gt("quantity", 0);

            setExpiringCount(count || 0);
        }
        fetchExpiringCount();
    }, []);

    const NavLink = ({ item }: { item: NavItem }) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

        return (
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link href={item.href}>
                            <motion.div
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                                    isCollapsed && "justify-center px-2"
                                )}
                                whileHover={{ x: isCollapsed ? 0 : 4 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                                {!isCollapsed && (
                                    <span className="font-medium text-sm">{item.title}</span>
                                )}
                                {item.badge && !isCollapsed && (
                                    <Badge
                                        className={cn(
                                            "ml-auto text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5",
                                            item.badgeColor || "bg-primary"
                                        )}
                                    >
                                        {item.badge}
                                    </Badge>
                                )}
                                {item.badge && isCollapsed && (
                                    <span className={cn(
                                        "absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white",
                                        item.badgeColor || "bg-primary"
                                    )}>
                                        {item.badge > 9 ? "9+" : item.badge}
                                    </span>
                                )}
                            </motion.div>
                        </Link>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                </Tooltip>
            </TooltipProvider>
        );
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={cn(
                "flex items-center gap-3 px-4 py-6",
                isCollapsed && "justify-center px-2"
            )}>
                <motion.div
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pharma-emerald flex items-center justify-center flex-shrink-0"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                >
                    <Pill className="w-5 h-5 text-white" />
                </motion.div>
                {!isCollapsed && (
                    <motion.span
                        className="text-xl font-bold"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <GradientText>PharmaFlow</GradientText>
                    </motion.span>
                )}
            </div>

            {/* Main Navigation */}
            <div className="flex-1 px-3 overflow-y-auto scrollbar-hide">
                <div className="space-y-1">
                    {!isCollapsed && (
                        <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">
                            Main
                        </p>
                    )}
                    {mainNavItems.map((item) => (
                        <NavLink key={item.href} item={item} />
                    ))}
                </div>

                <div className="my-4 border-t border-border/50" />

                <div className="space-y-1">
                    {!isCollapsed && (
                        <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">
                            Management
                        </p>
                    )}
                    {[
                        ...managementNavItemsBase,
                        { title: "Expiring Soon", href: "/dashboard/management/expiring", icon: AlertTriangle, badge: expiringCount, badgeColor: "bg-amber-500" }
                    ].map((item) => (
                        <NavLink key={item.href} item={item} />
                    ))}
                </div>
            </div>

            {/* Bottom section */}
            <div className="p-3 border-t border-border/50">
                <Link href="/dashboard/settings">
                    <motion.div
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all",
                            isCollapsed && "justify-center px-2"
                        )}
                        whileHover={{ x: isCollapsed ? 0 : 4 }}
                    >
                        <Settings className="w-5 h-5" />
                        {!isCollapsed && <span className="font-medium text-sm">Settings</span>}
                    </motion.div>
                </Link>

                {/* User profile */}
                <div className={cn(
                    "flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-accent/50",
                    isCollapsed && "justify-center px-2"
                )}>
                    <Avatar className="w-9 h-9 border-2 border-primary/30">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-pharma-emerald text-white text-sm">
                            {profile?.name?.substring(0, 2).toUpperCase() || 'PF'}
                        </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{profile?.name || 'Pharmacist'}</p>
                            <p className="text-xs text-muted-foreground truncate capitalize">{profile?.role || 'User'}</p>
                        </div>
                    )}
                    {!isCollapsed && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={signOut}
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Collapse button - desktop only */}
            <div className="hidden lg:block p-3 pt-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-muted-foreground"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    {!isCollapsed && <span className="ml-2 text-xs">Collapse</span>}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex bg-background">
            {/* Mobile menu button */}
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-4 left-4 z-50 lg:hidden"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            {/* Mobile overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                className={cn(
                    "fixed lg:sticky top-0 left-0 h-screen z-40 glass-card border-r border-white/10 flex flex-col",
                    "lg:translate-x-0",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
                initial={false}
                animate={{
                    width: isCollapsed ? 80 : 260,
                    x: isMobileOpen || typeof window !== 'undefined' && window.innerWidth >= 1024 ? 0 : -280
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                <SidebarContent />
            </motion.aside>

            {/* Main content */}
            <main
                className={cn(
                    "flex-1 min-h-screen transition-all duration-300",
                    "lg:ml-0"
                )}
            >
                {children}
            </main>
        </div>
    );
}
