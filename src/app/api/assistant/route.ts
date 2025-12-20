import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

// Initialize Groq
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "",
});

// Initialize Supabase with service role key (bypasses RLS for API route)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(request: NextRequest) {
    try {
        const { message, conversationHistory } = await request.json();

        // Validate input
        if (!message || typeof message !== "string") {
            return NextResponse.json(
                { error: "Invalid input: message is required" },
                { status: 400 }
            );
        }

        // Check API key
        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json(
                { error: "GROQ_API_KEY not configured" },
                { status: 500 }
            );
        }

        // Build pharmacy context
        const context = await buildPharmacyContext();

        // Build conversation messages
        const messages: any[] = [
            {
                role: "system",
                content: `You are a helpful AI assistant for a pharmacy inventory management system called "Smart Pharmacy". 

CRITICAL RULES:
1. ONLY use the real data provided in the context below
2. NEVER make up or guess medicine names, stock levels, or sales figures
3. If you don't have specific information, say "I don't have that information in the current data"
4. Always cite exact numbers from the context when answering
5. If asked about a medicine not in the context, say it's not in the current inventory records

**TOPIC RESTRICTION (STRICTLY ENFORCED):**
- You are STRICTLY limited to pharmacy and medical topics ONLY
- Allowed topics: inventory, medicines, stock levels, sales, expiry, suppliers, drug information, dosages, side effects, medical advice
- If a user asks about ANYTHING unrelated (politics, entertainment, jokes, coding, general knowledge, sports, movies, weather, etc.), you MUST politely decline with:
  "I'm a pharmacy assistant and can only help with pharmacy-related queries such as inventory management, medicine information, sales, stock levels, and medical guidance. Is there anything pharmacy-related I can help you with? 💊"
- NEVER answer non-pharmacy questions, even if you technically know the answer
- Stay in character as a pharmacy professional at all times

**FORMATTING RULES:**
- Use **bold** for important numbers and medicine names
- Use tables for comparing data (e.g., stock levels, sales)
- Use bullet lists for multiple items
- Use emojis occasionally for visual appeal (🟢 OK, 🟡 Low, 🔴 Critical, 📊, 💊, etc.)
- Keep responses concise and well-structured

**MEDICINE INFORMATION FEATURE:**
When asked about medicine information (e.g., "What is Paracetamol used for?", "Tell me about Cetirizine"):
- Provide accurate medical information including:
  - **Primary Uses**: What the medicine treats
  - **Dosage**: Typical dosing for adults (general guidance)
  - **Side Effects**: Common side effects
  - **Warnings**: Important contraindications or precautions
  - **Storage**: How to store the medicine
- Use your medical knowledge to provide accurate information
- Always add disclaimer: "⚠️ This is general information. Consult a healthcare professional for specific medical advice."

**CHART GENERATION:**
If user asks for charts or visualizations (e.g., "show me a chart", "visualize stock levels"):
- Respond with: "I'll generate a chart for you with the data."
- Include the data in your response in a clear format (the frontend will render it)

**REAL-TIME PHARMACY DATA:**
${context}

Your role is to:
- Answer inventory questions with EXACT data from above  
- Provide sales insights using ONLY the numbers provided
- Alert about low stock, out of stock, or expiring medicines from the lists above
- Give recommendations based on the actual data shown
- Help with stock management decisions
- Provide accurate medicine information when asked
- Support data visualization requests

**Example response format:**
When asked "What's running low?", respond like:

### 🟡 Low Stock Alert

| Medicine | Current Stock | Reorder Level | Status |
|----------|--------------|---------------|---------|
| **Paracetamol 500mg** | 45 units | 50 | 🟡 Low |
| **Cetirizine 10mg** | 30 units | 50 | 🔴 Critical |

**Recommendation**: Reorder these medicines soon to avoid stockouts.

When asked "What is Paracetamol?", respond like:

### 💊 Paracetamol (Acetaminophen)

**Primary Uses:**
- Pain relief (headaches, muscle aches, arthritis)
- Fever reduction

**Dosage:**
- Adults: 500-1000mg every 4-6 hours (max 4000mg/day)
- Children: Based on weight (consult pediatrician)

**Common Side Effects:**
- Generally well-tolerated
- Rarely: nausea, rash, liver problems (with overdose)

**Warnings:**
- ⚠️ Do not exceed recommended dose
- Avoid with liver disease
- Check alcohol intake

**Storage:**  
Store at room temperature, away from moisture

⚠️ This is general information. Consult a healthcare professional for specific medical advice.

Be concise, professional, and ONLY use real data for inventory. Provide accurate medical info when asked.`
            }
        ];

        // Add conversation history (last 5 messages for context)
        if (conversationHistory && Array.isArray(conversationHistory)) {
            const recentHistory = conversationHistory.slice(-5);
            recentHistory.forEach((msg: any) => {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            });
        }

        // Add current user message
        messages.push({
            role: "user",
            content: message
        });

        // Call Groq API
        const chatCompletion = await groq.chat.completions.create({
            messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
            top_p: 0.9,
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";

        return NextResponse.json({
            success: true,
            response: responseText,
        });

    } catch (error: any) {
        console.error("Assistant API error:", error);

        // Handle specific error types
        if (error.message?.includes("API key") || error.message?.includes("401")) {
            return NextResponse.json(
                { error: "Invalid or missing Groq API key" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                error: "Failed to get AI response",
                details: error.message
            },
            { status: 500 }
        );
    }
}

async function buildPharmacyContext(): Promise<string> {
    try {
        let contextParts: string[] = [];

        // 1. Get detailed inventory with stock levels
        const { data: medicines, error: medicinesError } = await supabase
            .from("medicines")
            .select(`
                id,
                name,
                reorder_level,
                batches (
                    id,
                    batch_number,
                    quantity,
                    expiry_date,
                    selling_price,
                    cost_price
                )
            `)
            .order('name', { ascending: true });


        if (medicinesError) {
            console.error("Supabase error fetching medicines:", medicinesError);
            contextParts.push(`**ERROR:** Unable to fetch inventory data: ${medicinesError.message}`);
        } else if (medicines && medicines.length > 0) {
            contextParts.push(`**CURRENT INVENTORY (${medicines.length} medicines):**\n`);

            // Create detailed medicine list with stock levels
            const medicineDetails: string[] = [];
            let lowStockItems: string[] = [];
            let outOfStockItems: string[] = [];
            let expiringItems: string[] = [];

            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            medicines.forEach((med: any) => {
                const batches = med.batches || [];
                const totalStock = batches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0);
                const reorderLevel = med.reorder_level || 50;

                // Build medicine entry
                let medEntry = `- ${med.name}: ${totalStock} units in stock`;

                if (batches.length > 0) {
                    medEntry += ` across ${batches.length} batch${batches.length > 1 ? 'es' : ''}`;
                }

                medicineDetails.push(medEntry);

                // Track stock status
                if (totalStock === 0) {
                    outOfStockItems.push(med.name);
                } else if (totalStock < reorderLevel) {
                    lowStockItems.push(`${med.name} (${totalStock} units, reorder at ${reorderLevel})`);
                }

                // Check for expiring batches
                batches.forEach((batch: any) => {
                    const expiryDate = new Date(batch.expiry_date);
                    if (expiryDate >= new Date() && expiryDate <= thirtyDaysFromNow) {
                        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        expiringItems.push(`${med.name}: ${batch.quantity} units expiring in ${daysUntilExpiry} days (${expiryDate.toLocaleDateString()})`);
                    }
                });
            });

            // Add medicine list (limit to 50 for context size)
            contextParts.push(medicineDetails.slice(0, 50).join('\n'));
            if (medicineDetails.length > 50) {
                contextParts.push(`... and ${medicineDetails.length - 50} more medicines`);
            }

            // Critical alerts
            if (outOfStockItems.length > 0) {
                contextParts.push(`\n**OUT OF STOCK (${outOfStockItems.length}):**`);
                contextParts.push(outOfStockItems.slice(0, 10).join(', '));
                if (outOfStockItems.length > 10) {
                    contextParts.push(`... and ${outOfStockItems.length - 10} more`);
                }
            }

            // Low stock alerts
            if (lowStockItems.length > 0) {
                contextParts.push(`\n**LOW STOCK (${lowStockItems.length}):**`);
                contextParts.push(lowStockItems.slice(0, 10).join('\n'));
                if (lowStockItems.length > 10) {
                    contextParts.push(`... and ${lowStockItems.length - 10} more`);
                }
            }

            // Expiring soon
            if (expiringItems.length > 0) {
                contextParts.push(`\n**EXPIRING IN 30 DAYS (${expiringItems.length}):**`);
                contextParts.push(expiringItems.slice(0, 10).join('\n'));
                if (expiringItems.length > 10) {
                    contextParts.push(`... and ${expiringItems.length - 10} more`);
                }
            }
        }

        // 2. Get sales from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: todaySales, error: salesError } = await supabase
            .from("sales")
            .select(`
                id,
                total,
                payment_method,
                created_at,
                status,
                sale_items (
                    quantity,
                    unit_price,
                    batch_id
                )
            `)
            .gte("created_at", sevenDaysAgo.toISOString())
            .order("created_at", { ascending: false })
            .limit(100);


        if (salesError) {
            console.error("Sales query error:", salesError);
            contextParts.push(`\n**TODAY'S SALES:** Error fetching sales data`);
        } else if (todaySales && todaySales.length > 0) {
            const totalRevenue = todaySales.reduce((sum, sale: any) => sum + (sale.total || 0), 0);
            const totalTransactions = todaySales.length;

            // Get medicine names for sale items
            const saleItemsWithMeds: any[] = [];
            for (const sale of todaySales) {
                if (sale.sale_items) {
                    for (const item of sale.sale_items) {
                        if (item.batch_id) {
                            const { data: batch } = await supabase
                                .from("batches")
                                .select("medicine_id")
                                .eq("id", item.batch_id)
                                .single();

                            if (batch) {
                                const { data: medicine } = await supabase
                                    .from("medicines")
                                    .select("name")
                                    .eq("id", batch.medicine_id)
                                    .single();

                                if (medicine) {
                                    saleItemsWithMeds.push({
                                        name: medicine.name,
                                        quantity: item.quantity,
                                        price: item.unit_price
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // Calculate top sellers
            const medicineSales: { [key: string]: { qty: number, revenue: number } } = {};
            saleItemsWithMeds.forEach((item) => {
                if (!medicineSales[item.name]) {
                    medicineSales[item.name] = { qty: 0, revenue: 0 };
                }
                medicineSales[item.name].qty += item.quantity || 0;
                medicineSales[item.name].revenue += (item.quantity || 0) * (item.price || 0);
            });

            const topSellers = Object.entries(medicineSales)
                .sort((a, b) => b[1].qty - a[1].qty)
                .slice(0, 5);

            contextParts.push(`\n**RECENT SALES (Last 7 Days):**`);
            contextParts.push(`- Total transactions: ${totalTransactions}`);
            contextParts.push(`- Total revenue: ₹${totalRevenue.toFixed(2)}`);

            if (topSellers.length > 0) {
                contextParts.push(`\nTop sellers:`);
                topSellers.forEach(([name, data], idx) => {
                    contextParts.push(`${idx + 1}. ${name}: ${data.qty} units (₹${data.revenue.toFixed(2)})`);
                });
            }
        } else {
            contextParts.push(`\n**RECENT SALES:** No sales in the last 7 days.`);
        }

        return contextParts.join('\n');
    } catch (error) {
        console.error("Error building context:", error);
        return "Error: Unable to fetch pharmacy data. Please check database connection.";
    }
}
