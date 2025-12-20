import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface StockChartProps {
    data: Array<{
        name: string;
        stock: number;
        reorderLevel: number;
    }>;
}

export function StockLevelChart({ data }: StockChartProps) {
    const getBarColor = (stock: number, reorderLevel: number) => {
        if (stock === 0) return "#ef4444"; // red
        if (stock < reorderLevel) return "#f59e0b"; // amber
        return "#10b981"; // green
    };

    return (
        <div className="my-4 p-4 rounded-lg bg-accent/30">
            <h4 className="text-sm font-semibold mb-3">📊 Stock Levels</h4>
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "12px",
                        }}
                    />
                    <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={getBarColor(entry.stock, entry.reorderLevel)}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-3 text-xs mt-2 justify-center">
                <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    Healthy
                </span>
                <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    Low
                </span>
                <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    Critical
                </span>
            </div>
        </div>
    );
}
