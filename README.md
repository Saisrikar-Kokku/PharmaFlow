# 💊 PharmaFlow - Smart Pharmacy Inventory Management

![PharmaFlow](public/logo.jpg)

> **AI-Powered Pharmacy Intelligence** - Predict demand, prevent expiry, and maximize profits with intelligent forecasting and batch management.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

---

## ✨ Features

### 📦 Inventory Management
- **Real-time stock tracking** with batch-level granularity
- **FEFO (First-Expired-First-Out)** logic for automatic expiry prioritization
- **Multi-batch support** for medicines with different expiry dates
- **Low stock alerts** with configurable thresholds
- **Category-based organization** for easy navigation

### 🤖 AI-Powered Intelligence
- **Demand Forecasting** - Predict seasonal spikes using machine learning
- **Smart Reorder Points** - AI suggests optimal stock levels
- **AI Pharmacy Assistant** - Natural language queries for instant insights
- **Alternative Medicine Suggestions** - Find generic alternatives automatically

### 💰 Sales & Billing
- **Lightning-fast POS** with batch-aware checkout
- **Automatic FEFO selection** - Sells expiring items first
- **Invoice generation** with print support
- **Sales history** and analytics
- **Customer management**

### 🔔 Smart Alerts
- **Expiry notifications** (30/60/90 day warnings)
- **Low stock alerts** with reorder suggestions
- **Price change monitoring**
- **Real-time notifications** via toast messages

### 📊 Analytics & Reporting
- **Revenue dashboards** with trend analysis
- **Inventory turnover rates**
- **Waste prevention metrics**
- **Forecasting accuracy reports**
- **Seasonal pattern detection**

### 🎨 Modern UI/UX
- **Beautiful dark theme** with glassmorphism effects
- **Smooth animations** using Framer Motion
- **3D animated landing page** with pharma theme
- **Responsive design** for all devices
- **Skeleton loaders** for perceived performance

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pharmaflow.git
   cd pharmaflow/smart-pharmacy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GEMINI_API_KEY=your_gemini_api_key  # For AI features
   ```

4. **Run database migrations**
   - Navigate to Supabase SQL Editor
   - Execute migration files from `/supabase-migrations` folder in order

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Supabase** | Backend-as-a-Service (PostgreSQL + Auth) |
| **Tailwind CSS v4** | Utility-first styling |
| **Framer Motion** | Animations and transitions |
| **Shadcn/ui** | Component library |
| **Google Gemini** | AI assistant capabilities |
| **Lucide React** | Icon library |

---

## 📁 Project Structure

```
smart-pharmacy/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Main dashboard pages
│   │   │   ├── inventory/      # Inventory management
│   │   │   ├── sales/          # POS and sales
│   │   │   ├── alerts/         # Alert management
│   │   │   ├── forecasting/    # AI forecasting
│   │   │   ├── analytics/      # Reports & analytics
│   │   │   ├── assistant/      # AI chatbot
│   │   │   └── management/     # Users, suppliers, categories
│   │   ├── login/              # Authentication
│   │   └── register/           # User registration
│   │
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── layout/             # Layout components
│   │   └── dashboard/          # Dashboard-specific components
│   │
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities and configurations
│   ├── services/               # API service functions
│   └── types/                  # TypeScript type definitions
│
├── public/                     # Static assets
├── supabase-migrations/        # Database migration scripts
└── supabase/                   # Supabase configuration
```

---

## 🗄️ Database Schema

### Core Tables
- `medicines` - Medicine catalog with pricing
- `batches` - Batch-level inventory with expiry dates
- `sales` - Transaction records
- `sale_items` - Individual sale line items
- `categories` - Medicine categories
- `suppliers` - Supplier management
- `alerts` - System notifications
- `profiles` - User profiles

### Key Features
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** for live updates
- **Optimized indexes** for fast queries

---

## 🔐 Authentication

PharmaFlow uses **Supabase Auth** with:
- Email/Password authentication
- Role-based access control (Admin, Pharmacist, Staff)
- Protected routes with middleware
- Session management

---

## 📱 Pages Overview

| Page | Description |
|------|-------------|
| `/` | Landing page with animations |
| `/login` | User sign in |
| `/register` | New user registration |
| `/dashboard` | Main dashboard with stats |
| `/dashboard/inventory` | Manage medicines & batches |
| `/dashboard/sales` | POS system & checkout |
| `/dashboard/alerts` | View and manage alerts |
| `/dashboard/forecasting` | AI demand predictions |
| `/dashboard/analytics` | Reports & insights |
| `/dashboard/assistant` | AI pharmacy chatbot |
| `/dashboard/settings` | User preferences |

---

## 🎯 Key Workflows

### Adding New Medicine
1. Go to Inventory → Add Medicine
2. Enter medicine details (name, generic name, category)
3. Add batch with quantity, price, and expiry date
4. System automatically tracks FEFO

### Making a Sale
1. Go to Sales page
2. Search/select medicines
3. System auto-selects FEFO batches
4. Checkout and generate invoice
5. Inventory automatically updated

### Checking Forecasts
1. Navigate to Forecasting
2. Select a medicine
3. View AI-generated demand predictions
4. Get reorder suggestions

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev         # Start dev server

# Production
npm run build       # Build for production
npm run start       # Start production server

# Type checking
npm run type-check  # Run TypeScript compiler
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for AI features |

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy!

### Docker

```bash
docker build -t pharmaflow .
docker run -p 3000:3000 pharmaflow
```

---

## 📄 License

MIT License - feel free to use for personal or commercial projects.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📧 Contact

- **Project**: PharmaFlow
- **Developer**: Saisrikar Kokku
- **Email**: [Your Email]

---

<p align="center">
  Made with ❤️ for pharmacies worldwide
</p>
