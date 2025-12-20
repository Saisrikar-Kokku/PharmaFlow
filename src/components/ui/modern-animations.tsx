"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef, ReactNode } from "react";

// Spotlight cursor following effect
export function SpotlightCard({
    children,
    className = "",
    spotlightColor = "rgba(16, 185, 129, 0.15)"
}: {
    children: ReactNode;
    className?: string;
    spotlightColor?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden ${className}`}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Spotlight effect */}
            <motion.div
                className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 rounded-inherit"
                style={{
                    background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
                    opacity: isHovered ? 1 : 0,
                }}
            />
            {children}
        </div>
    );
}

// Modern loading spinner with trail effect
export function ModernSpinner({
    size = 40,
    color = "#10b981"
}: {
    size?: number;
    color?: string;
}) {
    return (
        <div className="relative" style={{ width: size, height: size }}>
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: size * 0.15,
                        height: size * 0.15,
                        backgroundColor: color,
                        left: "50%",
                        top: "50%",
                        transformOrigin: "center",
                    }}
                    animate={{
                        rotate: [i * 45, i * 45 + 360],
                        scale: [1, 0.6, 1],
                        opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: "easeInOut",
                    }}
                    initial={{
                        x: Math.cos((i * 45 * Math.PI) / 180) * (size * 0.35) - size * 0.075,
                        y: Math.sin((i * 45 * Math.PI) / 180) * (size * 0.35) - size * 0.075,
                    }}
                />
            ))}
        </div>
    );
}

// Gradient border animation
export function AnimatedBorder({
    children,
    className = "",
    borderWidth = 2
}: {
    children: ReactNode;
    className?: string;
    borderWidth?: number;
}) {
    return (
        <div className={`relative ${className}`}>
            <div
                className="absolute -inset-[2px] rounded-xl opacity-75"
                style={{
                    background: "linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6, #f59e0b, #10b981)",
                    backgroundSize: "300% 100%",
                    animation: "gradient-x 3s ease infinite",
                    padding: borderWidth,
                }}
            />
            <div className="relative bg-background rounded-xl h-full w-full">
                {children}
            </div>
        </div>
    );
}

// Text scramble effect
export function TextScramble({
    text,
    className = ""
}: {
    text: string;
    className?: string;
}) {
    const [displayText, setDisplayText] = useState(text);
    const chars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    useEffect(() => {
        let iteration = 0;
        const interval = setInterval(() => {
            setDisplayText(
                text
                    .split("")
                    .map((char, index) => {
                        if (index < iteration) {
                            return text[index];
                        }
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join("")
            );

            if (iteration >= text.length) {
                clearInterval(interval);
            }
            iteration += 1 / 3;
        }, 30);

        return () => clearInterval(interval);
    }, [text]);

    return <span className={className}>{displayText}</span>;
}

// Morphing number counter
export function MorphNumber({
    value,
    className = "",
    duration = 1000
}: {
    value: number;
    className?: string;
    duration?: number;
}) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.floor(value * easeOut));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <span className={className}>{displayValue.toLocaleString()}</span>;
}

// Ripple button effect
export function RippleButton({
    children,
    onClick,
    className = ""
}: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
}) {
    const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();

        setRipples((prev) => [...prev, { x, y, id }]);
        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 600);

        onClick?.();
    };

    return (
        <button
            className={`relative overflow-hidden ${className}`}
            onClick={handleClick}
        >
            {ripples.map((ripple) => (
                <motion.span
                    key={ripple.id}
                    className="absolute rounded-full bg-white/30 pointer-events-none"
                    initial={{ width: 0, height: 0, opacity: 0.5 }}
                    animate={{ width: 400, height: 400, opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        transform: "translate(-50%, -50%)",
                    }}
                />
            ))}
            {children}
        </button>
    );
}

// Glitch text effect
export function GlitchText({
    text,
    className = ""
}: {
    text: string;
    className?: string;
}) {
    return (
        <div className={`relative ${className}`}>
            <span className="relative z-10">{text}</span>
            <span
                className="absolute left-0 top-0 text-cyan-400 opacity-70"
                style={{
                    animation: "glitch1 0.3s infinite",
                    clipPath: "inset(20% 0 30% 0)",
                }}
            >
                {text}
            </span>
            <span
                className="absolute left-0 top-0 text-red-400 opacity-70"
                style={{
                    animation: "glitch2 0.3s infinite",
                    clipPath: "inset(50% 0 20% 0)",
                }}
            >
                {text}
            </span>
        </div>
    );
}

// Hover card with 3D depth
export function DepthCard({
    children,
    className = ""
}: {
    children: ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        ref.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleMouseLeave = () => {
        if (ref.current) {
            ref.current.style.transform = "perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)";
        }
    };

    return (
        <div
            ref={ref}
            className={`transition-transform duration-200 ease-out ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ transformStyle: "preserve-3d" }}
        >
            {children}
        </div>
    );
}

// Animated gradient background
export function AnimatedGradient({ className = "" }: { className?: string }) {
    return (
        <div className={`absolute inset-0 ${className}`}>
            <motion.div
                className="absolute inset-0 opacity-50"
                style={{
                    background: "radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.3), transparent 50%)",
                }}
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, -50, 0],
                    y: [0, -50, 50, 0],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
            <motion.div
                className="absolute inset-0 opacity-30"
                style={{
                    background: "radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.3), transparent 40%)",
                }}
                animate={{
                    scale: [1.2, 1, 1.2],
                    x: [0, -30, 30, 0],
                    y: [0, 30, -30, 0],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                }}
            />
        </div>
    );
}

// Pulse ring effect (for notifications)
export function PulseRing({
    size = 12,
    color = "#ef4444"
}: {
    size?: number;
    color?: string;
}) {
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: color }}
            />
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: color }}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                }}
            />
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: color }}
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.4,
                }}
            />
        </div>
    );
}
