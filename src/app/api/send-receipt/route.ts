import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { sendEmail } from "@/lib/email/send-email";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { saleId, email } = await req.json();

    if (!saleId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch Sales Data
    const supabase = await createAdminSupabaseClient();
    const { data: sale, error } = await supabase
      .from("sales")
      .select("*, sale_items(*, medicines(name, dosage_form, strength))")
      .eq("id", saleId)
      .single() as any;

    if (error || !sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // 2. Generate Invoice HTML
    const date = new Date(sale.created_at).toLocaleString();
    const itemsHtml = sale.sale_items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.medicines?.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">$${item.unit_price}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">$${item.total}</td>
      </tr>
    `).join("");

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #10b981 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🏥 Smart Pharmacy</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">123 Medical Street, Healthcare City</p>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 12px;">Phone: +91 1234567890 | Email: contact@smartpharmacy.com</p>
        </div>

        <!-- Invoice Title -->
        <div style="background: #f8fafc; padding: 20px; text-align: center; border-bottom: 2px solid #e2e8f0;">
          <h2 style="margin: 0; color: #1e293b; font-size: 18px; letter-spacing: 2px;">SALES INVOICE</h2>
        </div>

        <!-- Invoice Details & Customer Info -->
        <div style="padding: 25px; display: flex; justify-content: space-between;">
          <table style="width: 100%;">
            <tr>
              <td style="vertical-align: top; width: 50%; padding-right: 15px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Invoice Details</p>
                <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;"><strong>Invoice #:</strong> ${sale.id?.slice(0, 8).toUpperCase() || 'N/A'}</p>
                <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;"><strong>Date:</strong> ${date}</p>
                <p style="margin: 0; font-size: 14px; color: #334155;">
                  <strong>Payment:</strong> 
                  <span style="display: inline-block; background: ${sale.payment_method === 'cash' ? '#dcfce7' : sale.payment_method === 'card' ? '#dbeafe' : '#fef3c7'}; color: ${sale.payment_method === 'cash' ? '#166534' : sale.payment_method === 'card' ? '#1e40af' : '#92400e'}; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                    ${sale.payment_method || 'N/A'}
                  </span>
                </p>
              </td>
              <td style="vertical-align: top; width: 50%; padding-left: 15px; border-left: 1px solid #e2e8f0;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Customer Details</p>
                <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;"><strong>Name:</strong> ${sale.customer_name || 'Walk-in Customer'}</p>
                <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;"><strong>Phone:</strong> ${sale.customer_phone || 'N/A'}</p>
                <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Email:</strong> ${email}</p>
              </td>
            </tr>
          </table>
        </div>

        <!-- Items Table -->
        <div style="padding: 0 25px 25px 25px;">
          <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #1e293b;">
                <th style="padding: 12px 15px; text-align: left; color: #ffffff; font-size: 13px; font-weight: 600;">Medicine</th>
                <th style="padding: 12px 15px; text-align: center; color: #ffffff; font-size: 13px; font-weight: 600;">Qty</th>
                <th style="padding: 12px 15px; text-align: right; color: #ffffff; font-size: 13px; font-weight: 600;">Price</th>
                <th style="padding: 12px 15px; text-align: right; color: #ffffff; font-size: 13px; font-weight: 600;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.sale_items.map((item: any, index: number) => {
      const med = item.medicines;
      const details = [med?.strength, med?.dosage_form].filter(Boolean).join(" ");
      const instructions = item.usage_instructions;

      return `
                <tr style="background: ${index % 2 === 0 ? '#f8fafc' : '#ffffff'};">
                  <td style="padding: 12px 15px; font-size: 14px; color: #334155; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-weight: 600;">${med?.name || 'Unknown'}</div>
                    ${details ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${details}</div>` : ''}
                    ${instructions ? `<div style="font-size: 12px; color: #059669; margin-top: 4px; font-style: italic;">📝 ${instructions}</div>` : ''}
                  </td>
                  <td style="padding: 12px 15px; text-align: center; font-size: 14px; color: #334155; border-bottom: 1px solid #e2e8f0; vertical-align: top;">${item.quantity}</td>
                  <td style="padding: 12px 15px; text-align: right; font-size: 14px; color: #334155; border-bottom: 1px solid #e2e8f0; vertical-align: top;">₹${Number(item.unit_price).toFixed(2)}</td>
                  <td style="padding: 12px 15px; text-align: right; font-size: 14px; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0; vertical-align: top;">₹${Number(item.total).toFixed(2)}</td>
                </tr>
              `;
    }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div style="padding: 0 25px 25px 25px;">
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-left: auto; max-width: 280px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-size: 14px; color: #64748b;">Subtotal:</span>
              <span style="font-size: 14px; color: #334155;">₹${Number(sale.subtotal || sale.total).toFixed(2)}</span>
            </div>
            ${sale.discount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-size: 14px; color: #10b981;">Discount:</span>
              <span style="font-size: 14px; color: #10b981;">-₹${Number(sale.discount).toFixed(2)}</span>
            </div>
            ` : ''}
            ${sale.tax ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-size: 14px; color: #64748b;">Tax (GST):</span>
              <span style="font-size: 14px; color: #334155;">₹${Number(sale.tax).toFixed(2)}</span>
            </div>
            ` : ''}
            <div style="border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 10px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: 18px; font-weight: 700; color: #1e293b;">Total:</span>
                <span style="font-size: 18px; font-weight: 700; color: #4f46e5;">₹${Number(sale.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #10b981; font-weight: 600;">✅ Thank you for your purchase!</p>
          <p style="margin: 0 0 15px 0; font-size: 12px; color: #64748b;">Please check the medicines before leaving. No returns after leaving the counter.</p>
          <p style="margin: 0; font-size: 11px; color: #94a3b8; font-style: italic;">This is a computer-generated invoice and does not require a signature.</p>
        </div>

      </div>
    `;

    // 3. Send Email
    await sendEmail({
      to: email,
      subject: `Receipt for your purchase - ${sale.invoice_number}`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error sending receipt:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
