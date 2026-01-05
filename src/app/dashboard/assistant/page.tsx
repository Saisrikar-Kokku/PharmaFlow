"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { GradientText, RevealOnScroll, TiltCard } from "@/components/ui/animated";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Bot,
    Send,
    Sparkles,
    TrendingUp,
    Package,
    AlertTriangle,
    AlertCircle,
    Clock,
    Trash2,
    User,
    Loader2,
    Download,
    Zap,
    ShoppingCart,
    Calendar,
    BarChart3,
    FileText,
    TrendingDown,
    CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PermissionDenied, hasPermission, UserRole } from "@/lib/permissions";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

const suggestedPromptCategories = [
    {
        title: "Inventory & Stock",
        icon: Package,
        color: "from-blue-500 to-cyan-500",
        prompts: [
            { text: "What's running low in stock?", icon: AlertCircle },
            { text: "Show me out of stock items", icon: TrendingDown },
            { text: "Which medicines need reordering?", icon: ShoppingCart },
        ],
    },
    {
        title: "Sales & Analytics",
        icon: BarChart3,
        color: "from-emerald-500 to-teal-500",
        prompts: [
            { text: "Show me today's sales summary", icon: TrendingUp },
            { text: "What are the top sellers this week?", icon: Sparkles },
            { text: "Compare this month vs last month", icon: Calendar },
        ],
    },
    {
        title: "Expiry & Alerts",
        icon: Clock,
        color: "from-amber-500 to-orange-500",
        prompts: [
            { text: "Show me expiring medicines", icon: Clock },
            { text: "What expires in the next 7 days?", icon: AlertCircle },
            { text: "Give me a waste prevention report", icon: FileText },
        ],
    },
];

export default function AssistantPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    // Fetch current user's role
    useEffect(() => {
        async function fetchUserRole() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();
                if (data) setUserRole(data.role as UserRole);
            }
            setLoading(false);
        }
        fetchUserRole();
    }, []);

    //Load conversation from localStorage on mount
    useEffect(() => {
        const savedMessages = localStorage.getItem('assistant-messages');
        const visitCount = parseInt(localStorage.getItem('assistant-visit-count') || '0') + 1;
        localStorage.setItem('assistant-visit-count', visitCount.toString());

        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages);
                // Convert timestamp strings back to Date objects
                const messagesWithDates = parsed.map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
                setMessages(messagesWithDates);
            } catch (error) {
                console.error('Error loading messages:', error);
                setMessages([getWelcomeMessage(visitCount)]);
            }
        } else {
            setMessages([getWelcomeMessage(visitCount)]);
        }
    }, []);

    // Save conversation to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('assistant-messages', JSON.stringify(messages));
        }
    }, [messages]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Helper function for personalized welcome
    function getWelcomeMessage(visitCount: number): Message {
        let greeting = "👋 Hello!";
        if (visitCount === 1) {
            greeting = "👋 Welcome to Smart Pharmacy AI Assistant!";
        } else if (visitCount > 1) {
            greeting = `👋 Welcome back! (Visit #${visitCount})`;
        }

        return {
            role: "assistant",
            content: `${greeting} I can help you with:\n\n📦 **Inventory Queries** - Stock levels, low stock alerts\n📊 **Sales Insights** - Today's sales, top sellers\n💊 **Medicine Information** - Uses, dosage, side effects\n⏰ **Expiry Alerts** - Medicines expiring soon\n\nHow can I assist you today?`,
            timestamp: new Date(),
        };
    }

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: "user",
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: input,
                    conversationHistory: messages,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();

            const assistantMessage: Message = {
                role: "assistant",
                content: data.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Assistant error:", error);
            toast.error("Failed to get response. Please try again.");

            const errorMessage: Message = {
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestedPrompt = (prompt: string) => {
        setInput(prompt);
        inputRef.current?.focus();
    };

    const handleClearChat = () => {
        const visitCount = parseInt(localStorage.getItem('assistant-visit-count') || '1');
        setMessages([getWelcomeMessage(visitCount)]);
        localStorage.removeItem('assistant-messages');
        toast.success("Chat cleared!");
    };

    const handleExportChat = () => {
        const chatText = messages
            .map((msg) => `[${msg.timestamp.toLocaleTimeString()}] ${msg.role.toUpperCase()}: ${msg.content}`)
            .join("\n\n");

        const blob = new Blob([chatText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pharmacy-assistant-chat-${new Date().toISOString().split("T")[0]}.txt`;
        a.click();
        toast.success("Chat exported!");
    };

    // Show loading state
    if (loading) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground mt-4">Loading...</p>
                </div>
            </div>
        );
    }

    // Permission check - only admin and pharmacist can use AI assistant
    if (!hasPermission(userRole, "USE_ASSISTANT")) {
        return (
            <PermissionDenied
                userRole={userRole}
                requiredRoles={["admin", "pharmacist"]}
                feature="use the AI Assistant"
            />
        );
    }

    return (
        <div className="p-6 lg:p-8 h-[calc(100vh-4rem)] flex flex-col gap-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Bot className="w-8 h-8 text-primary" />
                        <GradientText>AI Assistant</GradientText>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Your intelligent pharmacy management companion
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleExportChat}>
                        <Download className="w-4 h-4" />
                        Export
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleClearChat}>
                        <Trash2 className="w-4 h-4" />
                        Clear
                    </Button>
                </div>
            </motion.div>

            {/* Main Chat Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
                {/* Chat Messages */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-3 flex flex-col gap-4"
                >
                    <Card className="glass-card border-white/10 flex-1 flex flex-col min-h-0">
                        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                            <div className="space-y-4">
                                <AnimatePresence>
                                    {messages.map((message, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.3 }}
                                            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            {message.role === "assistant" && (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-pharma-emerald flex items-center justify-center flex-shrink-0">
                                                    <Bot className="w-4 h-4 text-white" />
                                                </div>
                                            )}

                                            <div
                                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "user"
                                                    ? "bg-gradient-to-r from-primary to-pharma-emerald text-white"
                                                    : "glass-card border-white/10"
                                                    }`}
                                            >
                                                {message.role === "assistant" ? (
                                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                table: ({ node, ...props }) => (
                                                                    <div className="overflow-x-auto my-4">
                                                                        <table className="min-w-full divide-y divide-white/10" {...props} />
                                                                    </div>
                                                                ),
                                                                thead: ({ node, ...props }) => (
                                                                    <thead className="bg-accent/30" {...props} />
                                                                ),
                                                                th: ({ node, ...props }) => (
                                                                    <th className="px-3 py-2 text-left text-xs font-semibold" {...props} />
                                                                ),
                                                                td: ({ node, ...props }) => (
                                                                    <td className="px-3 py-2 text-sm" {...props} />
                                                                ),
                                                                code: ({ node, inline, ...props }: any) =>
                                                                    inline ? (
                                                                        <code className="bg-accent/50 px-1.5 py-0.5 rounded text-xs" {...props} />
                                                                    ) : (
                                                                        <code className="block bg-accent/50 p-3 rounded-lg text-xs overflow-x-auto" {...props} />
                                                                    ),
                                                                strong: ({ node, ...props }) => (
                                                                    <strong className="font-bold text-primary" {...props} />
                                                                ),
                                                                ul: ({ node, ...props }) => (
                                                                    <ul className="list-disc list-inside space-y-1 my-2" {...props} />
                                                                ),
                                                                ol: ({ node, ...props }) => (
                                                                    <ol className="list-decimal list-inside space-y-1 my-2" {...props} />
                                                                ),
                                                            }}
                                                        >
                                                            {message.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                                )}
                                                <p className={`text-xs mt-1 ${message.role === "user" ? "text-white/70" : "text-muted-foreground"}`}>
                                                    {message.timestamp.toLocaleTimeString()}
                                                </p>
                                            </div>

                                            {message.role === "user" && (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {/* Loading Indicator */}
                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex gap-3"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-pharma-emerald flex items-center justify-center">
                                            <Bot className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="glass-card border-white/10 rounded-2xl px-4 py-3">
                                            <div className="flex gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                <span className="text-sm text-muted-foreground">Thinking...</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-4 border-t border-white/10">
                            <div className="flex gap-2">
                                <Input
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                                    placeholder="Ask me anything about your pharmacy..."
                                    className="flex-1 bg-background/50"
                                    disabled={isLoading}
                                />
                                <Button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="bg-gradient-to-r from-primary to-pharma-emerald hover:opacity-90"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Suggested Prompts Sidebar */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                >
                    {/* Categorized Prompts */}
                    {suggestedPromptCategories.map((category, catIndex) => (
                        <motion.div
                            key={catIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + catIndex * 0.1 }}
                        >
                            <Card className="glass-card border-white/10">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                                            <category.icon className="w-4 h-4 text-white" />
                                        </div>
                                        {category.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {category.prompts.map((prompt, pIndex) => (
                                        <Button
                                            key={pIndex}
                                            variant="ghost"
                                            className="w-full justify-start gap-2 h-auto py-2 text-left hover:bg-accent/50"
                                            onClick={() => handleSuggestedPrompt(prompt.text)}
                                        >
                                            <prompt.icon className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-xs flex-1">{prompt.text}</span>
                                        </Button>
                                    ))}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}

                    {/* AI Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card className="glass-card border-white/10 bg-gradient-to-br from-primary/5 to-pharma-emerald/5">
                            <CardContent className="p-4 text-center">
                                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-primary to-pharma-emerald flex items-center justify-center mb-2">
                                    <Zap className="w-6 h-6 text-white" />
                                </div>
                                <Badge className="bg-primary/10 text-primary mb-2">
                                    Powered by Groq AI
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                    Llama 3.3 70B - Lightning fast responses with real pharmacy data
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
