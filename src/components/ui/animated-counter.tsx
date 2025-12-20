"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    className?: string;
}

export function AnimatedCounter({
    value,
    duration = 1.5,
    prefix = "",
    suffix = "",
    decimals = 0,
    className = "",
}: AnimatedCounterProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const [hasAnimated, setHasAnimated] = useState(false);

    const spring = useSpring(0, {
        duration: duration * 1000,
        bounce: 0,
    });

    const display = useTransform(spring, (current) => {
        return `${prefix}${current.toFixed(decimals)}${suffix}`;
    });

    useEffect(() => {
        if (isInView && !hasAnimated) {
            spring.set(value);
            setHasAnimated(true);
        }
    }, [isInView, value, spring, hasAnimated]);

    // Update value if it changes after initial animation
    useEffect(() => {
        if (hasAnimated) {
            spring.set(value);
        }
    }, [value, spring, hasAnimated]);

    return (
        <motion.span ref={ref} className={className}>
            {display}
        </motion.span>
    );
}

// Variant with format options
export function AnimatedCurrency({
    value,
    duration = 1.5,
    currency = "₹",
    className = "",
}: {
    value: number;
    duration?: number;
    currency?: string;
    className?: string;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (isInView) {
            const startTime = Date.now();
            const endTime = startTime + duration * 1000;

            const animate = () => {
                const now = Date.now();
                const progress = Math.min(1, (now - startTime) / (duration * 1000));
                // Ease out cubic for smooth finish
                const eased = 1 - Math.pow(1 - progress, 3);
                setDisplayValue(value * eased);

                if (now < endTime) {
                    requestAnimationFrame(animate);
                } else {
                    setDisplayValue(value);
                }
            };

            requestAnimationFrame(animate);
        }
    }, [isInView, value, duration]);

    const formatted = displayValue >= 1000
        ? `${currency}${(displayValue / 1000).toFixed(1)}K`
        : `${currency}${displayValue.toFixed(2)}`;

    return (
        <span ref={ref} className={className}>
            {formatted}
        </span>
    );
}
