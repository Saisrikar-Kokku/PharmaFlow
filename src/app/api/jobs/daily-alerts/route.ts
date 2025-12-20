
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send-email";

export const dynamic = "force-dynamic";

// Initialize Supabase with service role key to bypass RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    try {
        // Check for secret header if needed (optional for now)
        // const authHeader = request.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }

        console.log("Starting daily alert check...");

        // 1. Get Low Stock Medicines
        const { data: medicines, error: medError } = await supabase
            .from("medicines")
            .select(`
                id,
                name,
                reorder_level,
                batches (quantity)
            `)
            .eq("is_active", true);

        if (medError) throw medError;

        const lowStockItems = medicines
            .map((med: any) => {
                const totalStock = med.batches?.reduce((sum: number, b: any) => sum + b.quantity, 0) || 0;
                return {
                    name: med.name,
                    stock: totalStock,
                    reorderLevel: med.reorder_level,
                    isCritical: totalStock === 0,
                    isLow: totalStock <= med.reorder_level
                };
            })
            .filter(item => item.isLow);

        // 2. Get Expiring Batches (Next 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const today = new Date();

        const { data: batches, error: batchError } = await supabase
            .from("batches")
            .select(`
                id,
                batch_number,
                expiry_date,
                quantity,
                medicines (name)
            `)
            .eq("status", "active")
            .gt("quantity", 0) // Only warn if we actually have stock
            .lte("expiry_date", thirtyDaysFromNow.toISOString())
            .gte("expiry_date", today.toISOString());

        if (batchError) throw batchError;

        const expiringItems = batches.map((batch: any) => {
            const expiry = new Date(batch.expiry_date);
            const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return {
                name: batch.medicines?.name || "Unknown Medicine",
                batchNumber: batch.batch_number,
                quantity: batch.quantity,
                expiryDate: batch.expiry_date,
                daysLeft
            };
        });

        // If no alerts, we can skip causing noise or send a "All Good" email (skipping for now)
        if (lowStockItems.length === 0 && expiringItems.length === 0) {
            return NextResponse.json({ message: "No critical alerts today", checks: { lowStock: 0, expiring: 0 } });
        }

        // 3. Generate Email Logic
        // Find Admins to notify
        const { data: admins, error: adminError } = await supabase
            .from("profiles")
            .select("email, name, preferences")
            .eq("role", "admin");

        if (adminError) throw adminError;

        if (!admins || admins.length === 0) {
            return NextResponse.json({ message: "No admins found to notify" });
        }

        // 4. Construct Email HTML
        const emailHtml = generateAlertEmailHtml(lowStockItems, expiringItems);
        const emailSubject = `🚨 Daily Alert: ${lowStockItems.length} Low Stock & ${expiringItems.length} Expiring Items`;

        let sentCount = 0;

        for (const admin of admins) {
            // Check preferences (default to true if not set)
            const prefs = admin.preferences as any;
            const wantsEmail = prefs?.notifications?.email !== false;
            // Also check specific alert types if you want granular control, but "Critical Alerts" usually override

            if (wantsEmail && admin.email) {
                await sendEmail({
                    to: admin.email,
                    subject: emailSubject,
                    html: emailHtml.replace("{{name}}", admin.name || "Admin"),
                });
                sentCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Alerts sent to ${sentCount} admins`,
            stats: {
                lowStock: lowStockItems.length,
                expiring: expiringItems.length,
                adminsNotified: sentCount
            }
        });

    } catch (error: any) {
        console.error("Daily Job Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function generateAlertEmailHtml(lowStockItems: any[], expiringItems: any[]) {
    const lowStockSection = lowStockItems.length > 0 ? `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #b91c1c; border-bottom: 2px solid #b91c1c; padding-bottom: 10px;">⚠️ Low Stock Alerts (${lowStockItems.length})</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #fef2f2;">
                    <th style="text-align: left; padding: 10px; border: 1px solid #fee2e2;">Medicine</th>
                    <th style="padding: 10px; border: 1px solid #fee2e2;">Stock</th>
                    <th style="padding: 10px; border: 1px solid #fee2e2;">Status</th>
                </tr>
                ${lowStockItems.map(item => `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>${item.name}</strong></td>
                        <td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; color: ${item.stock === 0 ? '#dc2626' : '#ea580c'}; font-weight: bold;">
                            ${item.stock} / ${item.reorderLevel}
                        </td>
                        <td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">
                            ${item.stock === 0
            ? '<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 12px; font-size: 12px;">OUT OF STOCK</span>'
            : '<span style="background: #ffedd5; color: #9a3412; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Running Low</span>'}
                        </td>
                    </tr>
                `).join('')}
            </table>
        </div>
    ` : '';

    const expiringSection = expiringItems.length > 0 ? `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #c2410c; border-bottom: 2px solid #c2410c; padding-bottom: 10px;">⏰ Expiring Soon (${expiringItems.length})</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #fff7ed;">
                    <th style="text-align: left; padding: 10px; border: 1px solid #ffedd5;">Medicine</th>
                    <th style="padding: 10px; border: 1px solid #ffedd5;">Batch</th>
                    <th style="padding: 10px; border: 1px solid #ffedd5;">Qty</th>
                    <th style="padding: 10px; border: 1px solid #ffedd5;">Days Left</th>
                </tr>
                ${expiringItems.slice(0, 10).map(item => `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">${item.name}</td>
                        <td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; font-family: monospace;">${item.batchNumber}</td>
                        <td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">${item.quantity}</td>
                        <td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; color: #c2410c; font-weight: bold;">${item.daysLeft} days</td>
                    </tr>
                `).join('')}
                ${expiringItems.length > 10 ? `<tr><td colspan="4" style="text-align: center; padding: 10px; color: #6b7280;">...and ${expiringItems.length - 10} more</td></tr>` : ''}
            </table>
        </div>
    ` : '';

    return `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1f2937;">
            <div style="background: linear-gradient(to right, #2563eb, #4f46e5); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Smart Pharmacy Daily Briefing</h1>
                <p style="color: #e0e7ff; margin: 5px 0 0 0;">Inventory Status Report</p>
            </div>
            
            <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p>Hello {{name}},</p>
                <p>Here is your daily overview of critical inventory items that require valid attention.</p>
                
                ${lowStockSection}
                ${expiringSection}
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/inventory" 
                       style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                        Open Dashboard
                    </a>
                </div>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
                <p>You received this email because you are an admin of Smart Pharmacy Inventory.</p>
                <p>To manage these alerts, visit Settings > Notifications.</p>
            </div>
        </div>
    `;
}
