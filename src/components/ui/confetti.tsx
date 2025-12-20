"use client";

import { useCallback, useEffect, useRef } from "react";

interface ConfettiPiece {
    x: number;
    y: number;
    size: number;
    color: string;
    speedX: number;
    speedY: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
}

const CONFETTI_COLORS = [
    "#10b981", // emerald
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#f59e0b", // amber
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#22c55e", // green
    "#f97316", // orange
];

export function useConfetti() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationRef = useRef<number | null>(null);
    const confettiRef = useRef<ConfettiPiece[]>([]);

    const createConfetti = useCallback((count: number = 100) => {
        const pieces: ConfettiPiece[] = [];
        for (let i = 0; i < count; i++) {
            pieces.push({
                x: Math.random() * window.innerWidth,
                y: -20,
                size: Math.random() * 10 + 5,
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                speedX: (Math.random() - 0.5) * 8,
                speedY: Math.random() * 4 + 2,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                opacity: 1,
            });
        }
        return pieces;
    }, []);

    const fire = useCallback(() => {
        // Create canvas if it doesn't exist
        if (!canvasRef.current) {
            const canvas = document.createElement("canvas");
            canvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                pointer-events: none;
                z-index: 9999;
            `;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            document.body.appendChild(canvas);
            canvasRef.current = canvas;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Create confetti pieces
        confettiRef.current = createConfetti(150);

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let stillActive = false;

            confettiRef.current.forEach((piece) => {
                // Update position
                piece.x += piece.speedX;
                piece.y += piece.speedY;
                piece.speedY += 0.1; // gravity
                piece.rotation += piece.rotationSpeed;
                piece.opacity -= 0.005;

                if (piece.y < canvas.height && piece.opacity > 0) {
                    stillActive = true;

                    // Draw confetti
                    ctx.save();
                    ctx.translate(piece.x, piece.y);
                    ctx.rotate((piece.rotation * Math.PI) / 180);
                    ctx.globalAlpha = piece.opacity;
                    ctx.fillStyle = piece.color;
                    ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size / 2);
                    ctx.restore();
                }
            });

            if (stillActive) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                // Cleanup
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (canvasRef.current) {
                    document.body.removeChild(canvasRef.current);
                    canvasRef.current = null;
                }
            }
        };

        animate();
    }, [createConfetti]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (canvasRef.current && document.body.contains(canvasRef.current)) {
                document.body.removeChild(canvasRef.current);
            }
        };
    }, []);

    return { fire };
}

// Simple component wrapper for declarative usage
export function Confetti({ trigger }: { trigger: boolean }) {
    const { fire } = useConfetti();

    useEffect(() => {
        if (trigger) {
            fire();
        }
    }, [trigger, fire]);

    return null;
}
