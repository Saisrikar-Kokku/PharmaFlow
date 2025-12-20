import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import Groq from "groq-sdk";

// Initialize Groq
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(request: NextRequest) {
    try {
        const { medicineName, salesHistory, currentStock, forecastPeriod } = await request.json();

        // Validate input
        if (!medicineName || !salesHistory || !Array.isArray(salesHistory)) {
            return NextResponse.json(
                { error: "Invalid input: medicineName and salesHistory (array) are required" },
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

        // Build the prompt
        const currentMonth = new Date().toLocaleString('default', { month: 'long' });
        const prompt = `You are an expert pharmacy inventory analyst. Analyze the sales data for "${medicineName}" and predict demand for the next ${forecastPeriod} days.

**Sales History (last ${salesHistory.length} transactions):**
${salesHistory.join(", ")} units

**Current Stock:** ${currentStock} units
**Current Month:** ${currentMonth}
**Category Hints:** ORS/Paracetamol/Cetirizine/Cough Syrup are seasonal (monsoon/winter). Metformin/Insulin are chronic (stable demand).

**Task:**
1. Calculate the forecasted demand for the next ${forecastPeriod} days
2. Determine the trend (up/down/stable)
3. Provide confidence (0-100%)
4. Explain your reasoning in 1-2 sentences

**Respond ONLY with valid JSON in this exact format:**
{
  "forecastedDemand": <number>,
  "trend": "<up|down|stable>",
  "confidence": <number between 50-100>,
  "reasoning": "<concise 1-2 sentence explanation>",
  "seasonalFactor": <number like 1.0, 1.5, 2.0>
}`;

        // Call Groq API
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a pharmacy inventory forecasting expert. Always respond with valid JSON only, no markdown formatting."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            max_tokens: 1024,
            top_p: 0.9,
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "";

        // Parse JSON from response
        // Remove markdown code blocks if present
        const cleanedText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const aiAnalysis = JSON.parse(cleanedText);

        // Validate response structure
        if (
            typeof aiAnalysis.forecastedDemand !== "number" ||
            !["up", "down", "stable"].includes(aiAnalysis.trend) ||
            typeof aiAnalysis.confidence !== "number" ||
            typeof aiAnalysis.reasoning !== "string"
        ) {
            throw new Error("Invalid AI response structure");
        }

        return NextResponse.json({
            success: true,
            data: {
                forecastedDemand: Math.round(aiAnalysis.forecastedDemand),
                trend: aiAnalysis.trend,
                confidence: Math.min(100, Math.max(50, aiAnalysis.confidence)),
                reasoning: aiAnalysis.reasoning,
                seasonalFactor: aiAnalysis.seasonalFactor || 1.0,
                source: "groq-llama3.1"
            }
        });

    } catch (error: any) {
        console.error("Groq AI forecast error:", error);

        // Handle specific error types
        if (error.message?.includes("API key") || error.message?.includes("401")) {
            return NextResponse.json(
                { error: "Invalid or missing Groq API key" },
                { status: 500 }
            );
        }

        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: "Failed to parse AI response" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                error: "Failed to generate AI forecast",
                details: error.message
            },
            { status: 500 }
        );
    }
}
