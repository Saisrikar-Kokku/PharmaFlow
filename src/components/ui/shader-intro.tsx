"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Pill } from "lucide-react";

export function ShaderIntro() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Check if we've already shown the intro in this session
        const hasShownIntro = sessionStorage.getItem("hasShownDashboardIntro");

        if (hasShownIntro) {
            setIsVisible(false);
            return;
        }

        // Timer to dismiss
        const timer = setTimeout(() => {
            setIsVisible(false);
            sessionStorage.setItem("hasShownDashboardIntro", "true");
        }, 3500); // 3.5s duration

        return () => clearTimeout(timer);
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, filter: "blur(10px)" }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
                >
                    {/* Aurora / Shader Background Effect */}
                    <div className="absolute inset-0 z-0">
                        <motion.div
                            animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-500/30 blur-[120px]"
                        />
                        <motion.div
                            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1], x: [0, 100, 0] }}
                            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-purple-500/30 blur-[120px]"
                        />
                        <motion.div
                            animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.9, 1.1, 0.9], y: [0, -50, 0] }}
                            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                            className="absolute bottom-[-20%] left-[20%] w-[80%] h-[80%] rounded-full bg-cyan-500/30 blur-[120px]"
                        />

                        {/* Moving Mesh Gradients */}
                        <motion.div
                            animate={{
                                rotate: [0, 360],
                                scale: [1, 1.2, 1],
                            }}
                            transition={{
                                duration: 20,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_50%)]"
                        />
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center justify-center space-y-8">
                        {/* Animated Logo */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="relative"
                        >
                            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                            <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 rounded-3xl flex items-center justify-center p-1 shadow-2xl ring-1 ring-white/20">
                                <div className="w-full h-full bg-black/90 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                    <Pill className="w-10 h-10 text-white fill-white/10" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Text Reveal */}
                        <div className="text-center space-y-3">
                            <motion.h1
                                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                transition={{ delay: 0.3, duration: 1 }}
                                className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50"
                            >
                                PharmaFlow
                            </motion.h1>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8, duration: 1 }}
                                className="flex items-center justify-center gap-2"
                            >
                                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-white/50" />
                                <p className="text-white/60 font-mono text-sm tracking-[0.3em] uppercase">
                                    Intelligent Inventory System
                                </p>
                                <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-white/50" />
                            </motion.div>
                        </div>

                        {/* Loading Bar */}
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 200, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 2.5, ease: "easeInOut" }}
                            className="h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent rounded-full"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
