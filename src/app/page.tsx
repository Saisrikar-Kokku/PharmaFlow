"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AnimatedText,
  GradientText,
  TiltCard,
  MagneticButton,
  FloatingElement,
  StaggerContainer,
  StaggerItem,
  RevealOnScroll,
  MorphingBlob,
} from "@/components/ui/animated";
import {
  Pill,
  TrendingUp,
  Bell,
  Bot,
  Shield,
  Clock,
  ChartBar,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Package,
  Zap,
  BarChart3,
  Activity,
  MousePointerClick,
  Play,
  Star,
} from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "AI Demand Forecasting",
    description: "Predict seasonal spikes with machine learning. Never run out of high-demand medicines again.",
    color: "from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/25",
  },
  {
    icon: Clock,
    title: "Smart FEFO Logic",
    description: "Automated First-Expired-First-Out ensures zero waste and maximum profitability.",
    color: "from-blue-500 to-cyan-500",
    glow: "shadow-blue-500/25",
  },
  {
    icon: Bell,
    title: "Real-time Alerts",
    description: "Instant notifications for low stock, expiring batches, and price surges.",
    color: "from-amber-500 to-orange-500",
    glow: "shadow-amber-500/25",
  },
  {
    icon: Bot,
    title: "AI Pharmacy Assistant",
    description: "Natural language queries for instant stock checks and intelligent insights.",
    color: "from-purple-500 to-pink-500",
    glow: "shadow-purple-500/25",
  },
  {
    icon: ChartBar,
    title: "Advanced Analytics",
    description: "Deep insights into turnover rates, profit margins, and waste prevention.",
    color: "from-rose-500 to-red-500",
    glow: "shadow-rose-500/25",
  },
  {
    icon: Shield,
    title: "Batch Traceability",
    description: "Complete audit trail for every medicine from supplier to customer.",
    color: "from-indigo-500 to-violet-500",
    glow: "shadow-indigo-500/25",
  },
];

const stats = [
  { value: 40, suffix: "%", label: "Waste Reduction", icon: AlertTriangle, color: "text-emerald-400" },
  { value: 99, suffix: "%", label: "Stock Accuracy", icon: Package, color: "text-blue-400" },
  { value: 2, suffix: "x", label: "Faster Operations", icon: Zap, color: "text-amber-400" },
  { value: 50, suffix: "K+", label: "Medicines Tracked", icon: Activity, color: "text-purple-400" },
];

const testimonials = [
  {
    name: "Dr. Sarah Chen",
    role: "Chief Pharmacist, MedCare Hospital",
    content: "PharmaFlow reduced our medicine waste by 45% in just 3 months. The AI forecasting is incredibly accurate.",
    avatar: "SC",
  },
  {
    name: "Rajesh Kumar",
    role: "Owner, HealthFirst Pharmacy",
    content: "The FEFO system saved us lakhs in potential expiry losses. Best investment for our pharmacy.",
    avatar: "RK",
  },
  {
    name: "Dr. Priya Sharma",
    role: "Hospital Administrator",
    content: "Real-time alerts and smart reordering have transformed how we manage inventory. Highly recommended!",
    avatar: "PS",
  },
];

// Animated background grid
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(var(--primary) 1px, transparent 1px),
            linear-gradient(90deg, var(--primary) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, transparent 0%, var(--background) 70%)`,
        }}
      />
    </div>
  );
}

// Animated pills floating in background
function FloatingPills() {
  const pills = [
    { x: 10, y: 20, delay: 0, size: 24 },
    { x: 85, y: 15, delay: 1, size: 20 },
    { x: 75, y: 60, delay: 2, size: 28 },
    { x: 15, y: 70, delay: 0.5, size: 22 },
    { x: 50, y: 80, delay: 1.5, size: 18 },
    { x: 90, y: 40, delay: 2.5, size: 26 },
    { x: 5, y: 45, delay: 3, size: 20 },
    { x: 60, y: 25, delay: 0.8, size: 16 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pills.map((pill, i) => (
        <motion.div
          key={i}
          className="absolute text-primary/10"
          style={{ left: `${pill.x}%`, top: `${pill.y}%` }}
          animate={{
            y: [-20, 20, -20],
            rotate: [-10, 10, -10],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 6 + i,
            delay: pill.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Pill style={{ width: pill.size, height: pill.size }} />
        </motion.div>
      ))}
    </div>
  );
}

// Animated stat card
function StatCard({ stat, index }: { stat: typeof stats[0]; index: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = stat.value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= stat.value) {
        setCount(stat.value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [stat.value]);

  return (
    <TiltCard>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
      >
        <Card className="glass-card border-white/10 hover:border-primary/30 transition-all duration-500 group overflow-hidden">
          <CardContent className="p-6 text-center relative">
            {/* Gradient background on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />

            <motion.div
              className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center ${stat.color}`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <stat.icon className="w-7 h-7" />
            </motion.div>

            <div className="text-4xl font-bold text-foreground mb-1 relative">
              <span className={stat.color}>{count}</span>
              <span className="text-muted-foreground">{stat.suffix}</span>
            </div>
            <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
          </CardContent>
        </Card>
      </motion.div>
    </TiltCard>
  );
}

// Feature card with hover effects
function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <TiltCard>
        <Card className={`glass-card border-white/10 hover:border-primary/30 transition-all duration-500 group h-full overflow-hidden hover:shadow-2xl ${feature.glow}`}>
          <CardContent className="p-6 relative">
            {/* Animated gradient background */}
            <motion.div
              className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
            />

            {/* Icon container */}
            <motion.div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 relative`}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <feature.icon className="w-8 h-8 text-white" />

              {/* Glow effect */}
              <motion.div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} blur-xl opacity-50`}
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.div>

            <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{feature.description}</p>

            {/* Learn more link */}
            <motion.div
              className="mt-4 flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
              initial={{ x: -10 }}
              whileHover={{ x: 0 }}
            >
              <span className="text-sm font-medium">Learn more</span>
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </CardContent>
        </Card>
      </TiltCard>
    </motion.div>
  );
}

// Testimonial card
function TestimonialCard({ testimonial, index }: { testimonial: typeof testimonials[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
    >
      <Card className="glass-card border-white/10 h-full">
        <CardContent className="p-6">
          <div className="flex gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-muted-foreground mb-6 italic">&quot;{testimonial.content}&quot;</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-pharma-emerald flex items-center justify-center text-white font-semibold text-sm">
              {testimonial.avatar}
            </div>
            <div>
              <div className="font-semibold text-sm">{testimonial.name}</div>
              <div className="text-xs text-muted-foreground">{testimonial.role}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LandingPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const { scrollYProgress } = useScroll();
  const navOpacity = useTransform(scrollYProgress, [0, 0.1], [0, 1]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Animated backgrounds */}
      <GridBackground />
      <FloatingPills />

      {/* Morphing blobs */}
      <MorphingBlob className="w-[600px] h-[600px] -top-40 -left-40 opacity-30" color="primary" />
      <MorphingBlob className="w-[500px] h-[500px] top-1/2 -right-40 opacity-20" color="pharma-purple" />

      {/* Navigation */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/5"
        style={{ backgroundColor: `rgba(var(--background), ${navOpacity})` }}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-pharma-emerald to-primary flex items-center justify-center relative overflow-hidden"
                whileHover={{ scale: 1.05 }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ duration: 5, repeat: Infinity }}
                style={{ backgroundSize: '200% 200%' }}
              >
                <Pill className="w-5 h-5 text-white relative z-10" />
              </motion.div>
              <span className="text-xl font-bold">
                <GradientText>PharmaFlow</GradientText>
              </span>
            </motion.div>

            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  Sign In
                </Button>
              </Link>
              <MagneticButton>
                <Link href="/dashboard">
                  <Button className="bg-gradient-to-r from-primary to-pharma-emerald hover:opacity-90 transition-all shadow-lg shadow-primary/25">
                    Get Started
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </motion.span>
                  </Button>
                </Link>
              </MagneticButton>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        className="relative pt-32 pb-20 px-6 min-h-screen flex items-center"
        style={{ scale: heroScale }}
      >
        <div className="container mx-auto">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
              transition={{ duration: 0.6 }}
            >
              <Badge
                variant="secondary"
                className="mb-8 px-5 py-2.5 text-sm bg-primary/10 text-primary border-primary/20 backdrop-blur-sm"
              >
                <motion.span
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block mr-2"
                >
                  <Sparkles className="w-4 h-4" />
                </motion.span>
                AI-Powered Pharmacy Intelligence
              </Badge>
            </motion.div>

            {/* Main heading with animated text */}
            <motion.h1
              className="text-5xl sm:text-6xl lg:text-8xl font-bold mb-8 leading-[1.1] tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 30 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span className="text-foreground">Smart Inventory</span>
              <br />
              <GradientText className="text-6xl sm:text-7xl lg:text-8xl">Zero Waste</GradientText>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              className="text-xl sm:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Predict demand, prevent expiry, and maximize profits with
              <span className="text-primary font-medium"> AI-powered forecasting</span> and
              <span className="text-pharma-emerald font-medium"> intelligent batch management</span>.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <MagneticButton>
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="text-lg px-10 py-7 bg-gradient-to-r from-primary via-pharma-emerald to-primary hover:opacity-90 transition-all shadow-2xl shadow-primary/30 group relative overflow-hidden"
                  >
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ['-200%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    />
                    <span className="relative flex items-center">
                      Launch Dashboard
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </Link>
              </MagneticButton>

              <MagneticButton>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-10 py-7 border-primary/30 hover:bg-primary/10 backdrop-blur-sm group"
                >
                  <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Watch Demo
                </Button>
              </MagneticButton>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              className="flex items-center justify-center gap-6 text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: isLoaded ? 1 : 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-pharma-success" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-pharma-success" />
                14-day free trial
              </span>
              <span className="hidden sm:flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-pharma-success" />
                Cancel anytime
              </span>
            </motion.div>
          </div>

          {/* Stats Cards */}
          <div className="mt-24 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {stats.map((stat, index) => (
              <StatCard key={index} stat={stat} index={index} />
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <MousePointerClick className="w-6 h-6 text-muted-foreground" />
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section className="py-32 px-6 relative">
        <div className="container mx-auto">
          <RevealOnScroll className="text-center mb-20">
            <Badge variant="secondary" className="mb-6 px-5 py-2.5 bg-primary/10 text-primary border-primary/20">
              <BarChart3 className="w-4 h-4 mr-2" />
              Powerful Features
            </Badge>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Everything You Need to
              <br />
              <GradientText>Optimize Your Pharmacy</GradientText>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive AI-powered tools designed specifically for modern pharmacy operations
            </p>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6 relative overflow-hidden">
        <MorphingBlob className="w-[500px] h-[500px] top-0 left-1/2 -translate-x-1/2 opacity-20" color="pharma-emerald" />

        <div className="container mx-auto relative">
          <RevealOnScroll className="text-center mb-16">
            <Badge variant="secondary" className="mb-6 px-5 py-2.5 bg-primary/10 text-primary border-primary/20">
              <Star className="w-4 h-4 mr-2" />
              Testimonials
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Trusted by <GradientText>1000+ Pharmacies</GradientText>
            </h2>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={index} testimonial={testimonial} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="container mx-auto">
          <RevealOnScroll>
            <Card className="glass-card overflow-hidden border-primary/20 relative">
              <CardContent className="p-12 sm:p-20 text-center relative">
                {/* Animated background */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-pharma-purple/20"
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                  }}
                  transition={{ duration: 10, repeat: Infinity }}
                  style={{ backgroundSize: '200% 200%' }}
                />

                <div className="relative">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 mx-auto mb-8 relative"
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-pharma-emerald blur-xl opacity-50" />
                    <div className="relative w-full h-full rounded-full bg-gradient-to-r from-primary to-pharma-emerald flex items-center justify-center">
                      <Pill className="w-10 h-10 text-white" />
                    </div>
                  </motion.div>

                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                    Ready to Transform Your Pharmacy?
                  </h2>
                  <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                    Join pharmacies worldwide that have reduced waste by 40% and improved
                    stock accuracy to 99% with PharmaFlow.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <MagneticButton>
                      <Link href="/dashboard">
                        <Button
                          size="lg"
                          className="text-lg px-10 py-7 bg-gradient-to-r from-primary to-pharma-emerald hover:opacity-90 shadow-2xl shadow-primary/30"
                        >
                          Start Free Trial
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      </Link>
                    </MagneticButton>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-pharma-success" />
                        No credit card
                      </span>
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-pharma-success" />
                        14-day trial
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </RevealOnScroll>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <motion.div
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pharma-emerald flex items-center justify-center">
                <Pill className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">
                <GradientText>PharmaFlow</GradientText>
              </span>
            </motion.div>

            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-primary transition-colors">Features</Link>
              <Link href="#" className="hover:text-primary transition-colors">Pricing</Link>
              <Link href="#" className="hover:text-primary transition-colors">About</Link>
              <Link href="#" className="hover:text-primary transition-colors">Contact</Link>
            </div>

            <p className="text-sm text-muted-foreground">
              © 2024 PharmaFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
