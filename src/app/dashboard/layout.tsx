import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { ShaderIntro } from "@/components/ui/shader-intro";

// Force dynamic rendering for all dashboard pages
export const dynamic = 'force-dynamic';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <ShaderIntro />
            <DashboardSidebar>{children}</DashboardSidebar>
        </>
    );
}
