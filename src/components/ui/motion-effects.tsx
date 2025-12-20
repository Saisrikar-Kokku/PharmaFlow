"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

// Staggered container for list items
export const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
};

export const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 24,
        },
    },
};

// Fade up animation
export const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94],
        },
    },
};

// Scale fade animation
export const scaleFade = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.3,
            ease: "easeOut",
        },
    },
};

// Slide in from left
export const slideInLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
        },
    },
};

// Slide in from right
export const slideInRight = {
    hidden: { opacity: 0, x: 50 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
        },
    },
};

// Float animation component
export function FloatingElement({
    children,
    delay = 0,
    duration = 3,
    yOffset = 10,
}: {
    children: ReactNode;
    delay?: number;
    duration?: number;
    yOffset?: number;
}) {
    return (
        <motion.div
            animate={{
                y: [0, -yOffset, 0],
            }}
            transition={{
                duration,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
                delay,
            }}
        >
            {children}
        </motion.div>
    );
}

// Magnetic button effect
export function MagneticButton({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            className={className}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
            {children}
        </motion.div>
    );
}

// Glow card on hover
export function GlowCard({
    children,
    className = "",
    glowColor = "rgba(16, 185, 129, 0.4)",
}: {
    children: ReactNode;
    className?: string;
    glowColor?: string;
}) {
    return (
        <motion.div
            className={`relative ${className}`}
            whileHover={{
                boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}`,
            }}
            transition={{ duration: 0.3 }}
        >
            {children}
        </motion.div>
    );
}

// Animated background gradient
export function AnimatedGradientBg({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            className={`relative overflow-hidden ${className}`}
            initial={{ backgroundPosition: "0% 50%" }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            style={{
                backgroundSize: "200% 200%",
                backgroundImage: "linear-gradient(45deg, #10b981, #3b82f6, #8b5cf6, #10b981)",
            }}
        >
            {children}
        </motion.div>
    );
}

// Shimmer loading effect
export function ShimmerEffect({ className = "" }: { className?: string }) {
    return (
        <div className={`relative overflow-hidden bg-muted/50 ${className}`}>
            <motion.div
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ translateX: ["100%", "-100%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
}

// Typewriter text effect
export function TypewriterText({
    text,
    className = "",
    speed = 50,
}: {
    text: string;
    className?: string;
    speed?: number;
}) {
    return (
        <motion.span className={className}>
            {text.split("").map((char, index) => (
                <motion.span
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * (speed / 1000) }}
                >
                    {char}
                </motion.span>
            ))}
        </motion.span>
    );
}

// Counter with spring animation
export function SpringCounter({
    value,
    className = "",
}: {
    value: number;
    className?: string;
}) {
    return (
        <motion.span
            className={className}
            key={value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            {value}
        </motion.span>
    );
}

// Rotating border glow
export function RotatingBorderGlow({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`relative p-[2px] rounded-xl overflow-hidden ${className}`}>
            <motion.div
                className="absolute inset-0 rounded-xl"
                style={{
                    background: "conic-gradient(from 0deg, #10b981, #3b82f6, #8b5cf6, #f59e0b, #10b981)",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <div className="relative bg-background rounded-xl">
                {children}
            </div>
        </div>
    );
}

// Card flip animation
export function FlipCard({
    front,
    back,
    className = "",
}: {
    front: ReactNode;
    back: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            className={`relative perspective-1000 ${className}`}
            whileHover={{ rotateY: 180 }}
            transition={{ duration: 0.6 }}
            style={{ transformStyle: "preserve-3d" }}
        >
            <div className="backface-hidden">{front}</div>
            <div
                className="absolute inset-0 backface-hidden"
                style={{ transform: "rotateY(180deg)" }}
            >
                {back}
            </div>
        </motion.div>
    );
}

// Particle effect wrapper
export function ParticleWrapper({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`relative ${className}`}>
            {/* Floating particles */}
            {[...Array(5)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-primary/30"
                    style={{
                        left: `${20 + i * 15}%`,
                        top: `${30 + (i % 3) * 20}%`,
                    }}
                    animate={{
                        y: [-10, 10, -10],
                        opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                        duration: 2 + i * 0.5,
                        repeat: Infinity,
                        delay: i * 0.2,
                    }}
                />
            ))}
            {children}
        </div>
    );
}
