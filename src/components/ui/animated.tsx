"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ReactNode, useRef } from "react";

// Animated text that reveals letter by letter
export function AnimatedText({
    text,
    className = "",
    delay = 0
}: {
    text: string;
    className?: string;
    delay?: number;
}) {
    const letters = text.split("");

    return (
        <motion.span className={className}>
            {letters.map((letter, index) => (
                <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.4,
                        delay: delay + index * 0.03,
                        ease: [0.2, 0.65, 0.3, 0.9],
                    }}
                    className="inline-block"
                >
                    {letter === " " ? "\u00A0" : letter}
                </motion.span>
            ))}
        </motion.span>
    );
}

// Gradient text with animated gradient shift
export function GradientText({
    children,
    className = ""
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.span
            className={`bg-gradient-to-r from-primary via-pharma-emerald to-pharma-purple bg-clip-text text-transparent bg-[length:200%_auto] ${className}`}
            animate={{
                backgroundPosition: ["0% center", "100% center", "0% center"],
            }}
            transition={{
                duration: 5,
                ease: "linear",
                repeat: Infinity,
            }}
        >
            {children}
        </motion.span>
    );
}

// 3D tilt card effect
export function TiltCard({
    children,
    className = ""
}: {
    children: ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), { stiffness: 300, damping: 30 });

    function handleMouse(event: React.MouseEvent<HTMLDivElement>) {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const xPos = (event.clientX - rect.left) / rect.width - 0.5;
        const yPos = (event.clientY - rect.top) / rect.height - 0.5;
        x.set(xPos);
        y.set(yPos);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    return (
        <motion.div
            ref={ref}
            className={`${className}`}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
                perspective: 1000,
            }}
            onMouseMove={handleMouse}
            onMouseLeave={handleMouseLeave}
        >
            {children}
        </motion.div>
    );
}

// Magnetic button effect
export function MagneticButton({
    children,
    className = ""
}: {
    children: ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { stiffness: 150, damping: 15, mass: 0.1 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    function handleMouse(event: React.MouseEvent<HTMLDivElement>) {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set((event.clientX - centerX) * 0.3);
        y.set((event.clientY - centerY) * 0.3);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    return (
        <motion.div
            ref={ref}
            className={className}
            style={{ x: springX, y: springY }}
            onMouseMove={handleMouse}
            onMouseLeave={handleMouseLeave}
        >
            {children}
        </motion.div>
    );
}

// Floating animation wrapper
export function FloatingElement({
    children,
    delay = 0,
    duration = 4,
    y = 15
}: {
    children: ReactNode;
    delay?: number;
    duration?: number;
    y?: number;
}) {
    return (
        <motion.div
            animate={{
                y: [-y, y, -y],
                rotate: [-2, 2, -2]
            }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        >
            {children}
        </motion.div>
    );
}

// Staggered container for children animations
export function StaggerContainer({
    children,
    className = "",
    staggerDelay = 0.1,
    delayStart = 0
}: {
    children: ReactNode;
    className?: string;
    staggerDelay?: number;
    delayStart?: number;
}) {
    return (
        <motion.div
            className={className}
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        delayChildren: delayStart,
                        staggerChildren: staggerDelay,
                    },
                },
            }}
        >
            {children}
        </motion.div>
    );
}

// Stagger item for use inside StaggerContainer
export function StaggerItem({
    children,
    className = ""
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            className={className}
            variants={{
                hidden: { opacity: 0, y: 30, scale: 0.9 },
                visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                        type: "spring",
                        stiffness: 100,
                        damping: 12,
                    }
                },
            }}
        >
            {children}
        </motion.div>
    );
}

// Reveal on scroll
export function RevealOnScroll({
    children,
    className = "",
    direction = "up",
    delay = 0
}: {
    children: ReactNode;
    className?: string;
    direction?: "up" | "down" | "left" | "right";
    delay?: number;
}) {
    const directionOffset = {
        up: { y: 60 },
        down: { y: -60 },
        left: { x: 60 },
        right: { x: -60 },
    };

    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, ...directionOffset[direction] }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
                duration: 0.8,
                delay,
                ease: [0.21, 0.47, 0.32, 0.98],
            }}
        >
            {children}
        </motion.div>
    );
}

// Glowing orb background element
export function GlowingOrb({
    color = "primary",
    size = 400,
    className = "",
    blur = 100
}: {
    color?: "primary" | "purple" | "emerald" | "warning";
    size?: number;
    className?: string;
    blur?: number;
}) {
    const colorMap = {
        primary: "from-primary/30 to-primary/5",
        purple: "from-pharma-purple/30 to-pharma-purple/5",
        emerald: "from-pharma-emerald/30 to-pharma-emerald/5",
        warning: "from-pharma-warning/30 to-pharma-warning/5",
    };

    return (
        <motion.div
            className={`absolute rounded-full bg-gradient-radial ${colorMap[color]} pointer-events-none ${className}`}
            style={{
                width: size,
                height: size,
                filter: `blur(${blur}px)`,
            }}
            animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        />
    );
}

// Animated counter with spring physics
export function AnimatedCounter({
    value,
    className = "",
    duration = 2
}: {
    value: number;
    className?: string;
    duration?: number;
}) {
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, {
        stiffness: 100,
        damping: 30,
        duration: duration * 1000
    });
    const displayValue = useTransform(springValue, (v) => Math.round(v));

    return (
        <motion.span
            className={className}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            onViewportEnter={() => motionValue.set(value)}
        >
            <motion.span>{displayValue}</motion.span>
        </motion.span>
    );
}

// Particle field background
export function ParticleField({ count = 50 }: { count?: number }) {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(count)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-primary/30 rounded-full"
                    initial={{
                        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                        y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                    }}
                    animate={{
                        y: [null, Math.random() * -500 - 100],
                        opacity: [0, 1, 0],
                    }}
                    transition={{
                        duration: Math.random() * 10 + 10,
                        repeat: Infinity,
                        delay: Math.random() * 5,
                        ease: "linear",
                    }}
                />
            ))}
        </div>
    );
}

// Shimmer effect for loading or highlight
export function ShimmerBorder({
    children,
    className = ""
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`relative ${className}`}>
            <motion.div
                className="absolute inset-0 rounded-xl"
                style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                    backgroundSize: "200% 100%",
                }}
                animate={{
                    backgroundPosition: ["200% 0", "-200% 0"],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />
            {children}
        </div>
    );
}

// Morphing blob shape
export function MorphingBlob({
    className = "",
    color = "primary"
}: {
    className?: string;
    color?: string;
}) {
    return (
        <motion.div
            className={`absolute ${className}`}
            style={{
                background: `linear-gradient(135deg, var(--${color}), var(--pharma-emerald))`,
                filter: "blur(60px)",
            }}
            animate={{
                borderRadius: [
                    "60% 40% 30% 70% / 60% 30% 70% 40%",
                    "30% 60% 70% 40% / 50% 60% 30% 60%",
                    "60% 40% 30% 70% / 60% 30% 70% 40%",
                ],
                scale: [1, 1.1, 1],
                rotate: [0, 90, 0],
            }}
            transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        />
    );
}
