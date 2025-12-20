import type { Metadata } from "next";
export const dynamic = "force-dynamic";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PharmaFlow | Smart Pharmacy Inventory",
  description: "Intelligent Forecasting & Expiry Management System - Prevent waste, predict demand, and optimize your pharmacy operations.",
  keywords: ["pharmacy", "inventory", "forecasting", "FEFO", "medicine management", "healthcare"],
  authors: [{ name: "PharmaFlow" }],
  openGraph: {
    title: "PharmaFlow | Smart Pharmacy Inventory",
    description: "Intelligent Forecasting & Expiry Management System",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="relative min-h-screen">
          {/* Background gradient mesh */}
          <div className="fixed inset-0 gradient-mesh opacity-50 pointer-events-none" />

          {/* Main content */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
