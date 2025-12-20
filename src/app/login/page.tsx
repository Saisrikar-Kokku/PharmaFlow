"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradientText, MagneticButton } from "@/components/ui/animated";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
    Pill,
    Mail,
    Lock,
    ArrowRight,
    Loader2,
    Eye,
    EyeOff
} from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/dashboard";

    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success("Welcome back!");
                router.push(redirectTo);
                router.refresh();
            }
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Demo login for testing
    const handleDemoLogin = async () => {
        setIsLoading(true);
        try {
            // For demo purposes, we'll create a session or redirect to dashboard
            // In production, you'd have actual demo credentials
            toast.info("Demo mode - redirecting to dashboard");
            router.push("/dashboard");
        } catch {
            toast.error("Demo login failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 gradient-mesh opacity-50" />
            <motion.div
                className="absolute w-[500px] h-[500px] -top-40 -left-40 rounded-full bg-gradient-to-br from-primary/30 to-transparent blur-3xl"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 8, repeat: Infinity }}
            />
            <motion.div
                className="absolute w-[400px] h-[400px] -bottom-40 -right-40 rounded-full bg-gradient-to-br from-pharma-purple/30 to-transparent blur-3xl"
                animate={{
                    scale: [1.2, 1, 1.2],
                    opacity: [0.5, 0.3, 0.5],
                }}
                transition={{ duration: 8, repeat: Infinity }}
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-3 mb-8">
                    <motion.div
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-pharma-emerald flex items-center justify-center"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                    >
                        <Pill className="w-6 h-6 text-white" />
                    </motion.div>
                    <span className="text-2xl font-bold">
                        <GradientText>PharmaFlow</GradientText>
                    </span>
                </Link>

                <Card className="glass-card border-white/10">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-2xl">Welcome back</CardTitle>
                        <CardDescription>
                            Sign in to your account to continue
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        className="pl-10 bg-background/50"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="pl-10 pr-10 bg-background/50"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <MagneticButton className="w-full">
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-primary to-pharma-emerald hover:opacity-90"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : null}
                                    Sign In
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </MagneticButton>
                        </form>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">Or</span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleDemoLogin}
                            disabled={isLoading}
                        >
                            Try Demo Account
                        </Button>

                        <p className="text-center text-sm text-muted-foreground mt-6">
                            Don&apos;t have an account?{" "}
                            <Link href="/register" className="text-primary hover:underline font-medium">
                                Sign up
                            </Link>
                        </p>
                    </CardContent>
                </Card>

                {/* Trust indicators */}
                <motion.p
                    className="text-center text-xs text-muted-foreground mt-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    🔒 Secured by Supabase Authentication
                </motion.p>
            </motion.div>
        </div>
    );
}
