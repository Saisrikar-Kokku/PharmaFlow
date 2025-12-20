import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

// Force dynamic rendering for all dashboard pages - required for server-side data fetching
export const dynamic = 'force-dynamic';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardSidebar>{children}</DashboardSidebar>;
}
