// ============================================
// Smart Pharmacy Inventory - Type Definitions
// ============================================

// User Roles
export type UserRole = 'admin' | 'pharmacist' | 'staff';

// ============================================
// Core Entities
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  lead_time_days?: number;
  rating?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Medicine {
  id: string;
  name: string;
  generic_name?: string;
  category_id: string;
  category?: Category;
  supplier_id?: string;
  supplier?: Supplier;
  sku: string;
  barcode?: string;
  description?: string;
  dosage_form: DosageForm;
  strength?: string;
  unit: string;
  reorder_level: number;
  max_stock_level: number;
  storage_conditions?: string;
  requires_prescription: boolean;
  is_controlled: boolean;
  is_active: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
  
  // Computed fields (from batches)
  total_stock?: number;
  batches?: Batch[];
}

export type DosageForm = 
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'injection'
  | 'cream'
  | 'ointment'
  | 'drops'
  | 'inhaler'
  | 'powder'
  | 'suspension'
  | 'other';

// ============================================
// Batch Management (Critical for FEFO)
// ============================================

export interface Batch {
  id: string;
  medicine_id: string;
  medicine?: Medicine;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  quantity: number;
  initial_quantity: number;
  cost_price: number;
  selling_price: number;
  supplier_id?: string;
  supplier?: Supplier;
  received_date: string;
  location?: string;
  status: BatchStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  days_until_expiry?: number;
  expiry_status?: ExpiryStatus;
}

export type BatchStatus = 'active' | 'depleted' | 'expired' | 'returned' | 'damaged';
export type ExpiryStatus = 'safe' | 'warning' | 'critical' | 'expired';

// ============================================
// Sales & Transactions
// ============================================

export interface Sale {
  id: string;
  invoice_number: string;
  customer_name?: string;
  customer_phone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  medicine_id: string;
  medicine?: Medicine;
  batch_id: string;
  batch?: Batch;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'credit';
export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'refunded';

// ============================================
// Stock Movements
// ============================================

export interface StockMovement {
  id: string;
  medicine_id: string;
  medicine?: Medicine;
  batch_id: string;
  batch?: Batch;
  movement_type: MovementType;
  quantity: number;
  reference_id?: string;
  reference_type?: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer';
  reason?: string;
  performed_by: string;
  created_at: string;
}

export type MovementType = 'in' | 'out' | 'adjustment';

// ============================================
// Alerts & Notifications
// ============================================

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  medicine_id?: string;
  medicine?: Medicine;
  batch_id?: string;
  batch?: Batch;
  data?: Record<string, unknown>;
  is_read: boolean;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export type AlertType = 
  | 'low_stock'
  | 'expiry_warning'
  | 'expiry_critical'
  | 'out_of_stock'
  | 'demand_spike'
  | 'price_surge'
  | 'dead_stock'
  | 'reorder_suggestion';

export type AlertSeverity = 'info' | 'warning' | 'critical';

// ============================================
// Forecasting
// ============================================

export interface ForecastResult {
  id: string;
  medicine_id: string;
  medicine?: Medicine;
  forecast_date: string;
  period_start: string;
  period_end: string;
  forecasted_demand: number;
  confidence_level: number;
  method: ForecastMethod;
  seasonal_factor?: number;
  trend_direction?: 'up' | 'down' | 'stable';
  recommended_reorder_qty: number;
  reasoning?: string;
  created_at: string;
}

export type ForecastMethod = 
  | 'moving_average'
  | 'exponential_smoothing'
  | 'seasonal_adjustment'
  | 'ml_prophet'
  | 'ml_lstm';

export interface SeasonalPattern {
  id: string;
  medicine_id: string;
  season: Season;
  multiplier: number;
  notes?: string;
}

export type Season = 'monsoon' | 'winter' | 'summer' | 'flu_season' | 'festival';

// ============================================
// Analytics & Reports
// ============================================

export interface InventoryMetrics {
  total_medicines: number;
  total_batches: number;
  total_stock_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
  inventory_turnover_ratio: number;
  avg_days_to_expiry: number;
}

export interface SalesMetrics {
  total_sales: number;
  total_revenue: number;
  total_profit: number;
  avg_order_value: number;
  top_selling_medicines: MedicineSalesData[];
  sales_by_category: CategorySalesData[];
  sales_trend: TimeSeriesData[];
}

export interface WasteMetrics {
  total_expired_value: number;
  total_expired_units: number;
  prevented_waste_value: number;
  prevented_waste_units: number;
  waste_by_category: CategoryWasteData[];
  waste_trend: TimeSeriesData[];
}

export interface MedicineSalesData {
  medicine_id: string;
  medicine_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface CategorySalesData {
  category_id: string;
  category_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface CategoryWasteData {
  category_id: string;
  category_name: string;
  expired_value: number;
  expired_units: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

// ============================================
// Dashboard & UI State
// ============================================

export interface DashboardStats {
  inventory: InventoryMetrics;
  sales: {
    today: number;
    week: number;
    month: number;
  };
  alerts: {
    unread: number;
    critical: number;
  };
  recentAlerts: Alert[];
  expiringBatches: Batch[];
  lowStockMedicines: Medicine[];
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// Chatbot Types
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface QueryIntent {
  type: 'stock_check' | 'expiry_query' | 'sales_query' | 'forecast_query' | 'general';
  entities: {
    medicine_name?: string;
    time_period?: string;
    batch_number?: string;
  };
  confidence: number;
}
