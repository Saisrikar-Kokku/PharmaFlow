"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function PageLoading({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
            >
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block"
                >
                    <Loader2 className="w-8 h-8 text-primary" />
                </motion.div>
                <p className="text-sm text-muted-foreground">{message}</p>
            </motion.div>
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-8 w-1/2 bg-muted animate-pulse rounded" />
            <div className="h-3 w-full bg-muted animate-pulse rounded" />
        </div>
    );
}

export function SkeletonTable() {
    return (
        <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-muted animate-pulse rounded" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}


