// ============================================
// Supabase Database Type Definitions
// Auto-generated types matching the database schema
// ============================================

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    public: {
        Tables: {
            // Users table (extends Supabase auth.users)
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    name: string;
                    role: 'admin' | 'pharmacist' | 'staff';
                    avatar_url: string | null;
                    phone: string | null;
                    preferences: Json | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    name: string;
                    role?: 'admin' | 'pharmacist' | 'staff';
                    avatar_url?: string | null;
                    phone?: string | null;
                    preferences?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    name?: string;
                    role?: 'admin' | 'pharmacist' | 'staff';
                    avatar_url?: string | null;
                    phone?: string | null;
                    preferences?: Json | null;
                    updated_at?: string;
                };
            };

            // Medicine Categories
            categories: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    icon: string | null;
                    color: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    icon?: string | null;
                    color?: string | null;
                    created_at?: string;
                };
                Update: {
                    name?: string;
                    description?: string | null;
                    icon?: string | null;
                    color?: string | null;
                };
            };

            // Suppliers
            suppliers: {
                Row: {
                    id: string;
                    name: string;
                    contact_person: string | null;
                    email: string | null;
                    phone: string | null;
                    address: string | null;
                    city: string | null;
                    state: string | null;
                    pincode: string | null;
                    gst_number: string | null;
                    payment_terms: string | null;
                    lead_time_days: number | null;
                    rating: number | null;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    contact_person?: string | null;
                    email?: string | null;
                    phone?: string | null;
                    address?: string | null;
                    city?: string | null;
                    state?: string | null;
                    pincode?: string | null;
                    gst_number?: string | null;
                    payment_terms?: string | null;
                    lead_time_days?: number | null;
                    rating?: number | null;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    name?: string;
                    contact_person?: string | null;
                    email?: string | null;
                    phone?: string | null;
                    address?: string | null;
                    city?: string | null;
                    state?: string | null;
                    pincode?: string | null;
                    gst_number?: string | null;
                    payment_terms?: string | null;
                    lead_time_days?: number | null;
                    rating?: number | null;
                    is_active?: boolean;
                    updated_at?: string;
                };
            };

            // Medicines
            medicines: {
                Row: {
                    id: string;
                    name: string;
                    generic_name: string | null;
                    category_id: string;
                    supplier_id: string | null;
                    sku: string;
                    barcode: string | null;
                    description: string | null;
                    dosage_form: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'ointment' | 'drops' | 'inhaler' | 'powder' | 'suspension' | 'other';
                    strength: string | null;
                    unit: string;
                    reorder_level: number;
                    max_stock_level: number;
                    storage_conditions: string | null;
                    requires_prescription: boolean;
                    is_controlled: boolean;
                    is_active: boolean;
                    image_url: string | null;
                    usage_instructions: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    generic_name?: string | null;
                    category_id: string;
                    supplier_id?: string | null;
                    sku: string;
                    barcode?: string | null;
                    description?: string | null;
                    dosage_form?: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'ointment' | 'drops' | 'inhaler' | 'powder' | 'suspension' | 'other';
                    strength?: string | null;
                    unit?: string;
                    reorder_level?: number;
                    max_stock_level?: number;
                    storage_conditions?: string | null;
                    requires_prescription?: boolean;
                    is_controlled?: boolean;
                    is_active?: boolean;
                    image_url?: string | null;
                    usage_instructions?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    name?: string;
                    generic_name?: string | null;
                    category_id?: string;
                    supplier_id?: string | null;
                    sku?: string;
                    barcode?: string | null;
                    description?: string | null;
                    dosage_form?: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'ointment' | 'drops' | 'inhaler' | 'powder' | 'suspension' | 'other';
                    strength?: string | null;
                    unit?: string;
                    reorder_level?: number;
                    max_stock_level?: number;
                    storage_conditions?: string | null;
                    requires_prescription?: boolean;
                    is_controlled?: boolean;
                    is_active?: boolean;
                    image_url?: string | null;
                    usage_instructions?: string | null;
                    updated_at?: string;
                };
            };

            // Batches (Critical for FEFO)
            batches: {
                Row: {
                    id: string;
                    medicine_id: string;
                    batch_number: string;
                    manufacturing_date: string;
                    expiry_date: string;
                    quantity: number;
                    initial_quantity: number;
                    cost_price: number;
                    selling_price: number;
                    supplier_id: string | null;
                    received_date: string;
                    location: string | null;
                    status: 'active' | 'depleted' | 'expired' | 'returned' | 'damaged';
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    medicine_id: string;
                    batch_number: string;
                    manufacturing_date: string;
                    expiry_date: string;
                    quantity: number;
                    initial_quantity: number;
                    cost_price: number;
                    selling_price: number;
                    supplier_id?: string | null;
                    received_date?: string;
                    location?: string | null;
                    status?: 'active' | 'depleted' | 'expired' | 'returned' | 'damaged';
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    medicine_id?: string;
                    batch_number?: string;
                    manufacturing_date?: string;
                    expiry_date?: string;
                    quantity?: number;
                    initial_quantity?: number;
                    cost_price?: number;
                    selling_price?: number;
                    supplier_id?: string | null;
                    received_date?: string;
                    location?: string | null;
                    status?: 'active' | 'depleted' | 'expired' | 'returned' | 'damaged';
                    notes?: string | null;
                    updated_at?: string;
                };
            };

            // Sales
            sales: {
                Row: {
                    id: string;
                    invoice_number: string;
                    customer_name: string | null;
                    customer_phone: string | null;
                    customer_email: string | null;
                    subtotal: number;
                    discount: number;
                    tax: number;
                    total: number;
                    payment_method: 'cash' | 'card' | 'upi' | 'credit';
                    payment_status: 'paid' | 'pending' | 'partial' | 'refunded';
                    status: 'completed' | 'pending' | 'cancelled' | 'refunded';
                    notes: string | null;
                    created_by: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    invoice_number?: string;
                    customer_name?: string | null;
                    customer_phone?: string | null;
                    customer_email?: string | null;
                    subtotal?: number;
                    discount?: number;
                    tax?: number;
                    total: number;
                    payment_method?: 'cash' | 'card' | 'upi' | 'credit';
                    payment_status?: 'paid' | 'pending' | 'partial' | 'refunded';
                    status?: 'completed' | 'pending' | 'cancelled' | 'refunded';
                    notes?: string | null;
                    created_by?: string;
                    created_at?: string;
                };
                Update: {
                    invoice_number?: string;
                    customer_name?: string | null;
                    customer_phone?: string | null;
                    customer_email?: string | null;
                    subtotal?: number;
                    discount?: number;
                    tax?: number;
                    total?: number;
                    payment_method?: 'cash' | 'card' | 'upi' | 'credit';
                    payment_status?: 'paid' | 'pending' | 'partial' | 'refunded';
                    status?: 'completed' | 'pending' | 'cancelled' | 'refunded';
                    notes?: string | null;
                };
            };

            // Sale Items
            sale_items: {
                Row: {
                    id: string;
                    sale_id: string;
                    medicine_id: string;
                    batch_id: string;
                    quantity: number;
                    unit_price: number;
                    discount: number;
                    total: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    sale_id: string;
                    medicine_id: string;
                    batch_id: string;
                    quantity: number;
                    unit_price: number;
                    discount?: number;
                    total: number;
                    created_at?: string;
                };
                Update: {
                    sale_id?: string;
                    medicine_id?: string;
                    batch_id?: string;
                    quantity?: number;
                    unit_price?: number;
                    discount?: number;
                    total?: number;
                };
            };

            // Stock Movements
            stock_movements: {
                Row: {
                    id: string;
                    medicine_id: string;
                    batch_id: string;
                    movement_type: 'in' | 'out' | 'adjustment';
                    quantity: number;
                    reference_id: string | null;
                    reference_type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer' | null;
                    reason: string | null;
                    performed_by: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    medicine_id: string;
                    batch_id: string;
                    movement_type: 'in' | 'out' | 'adjustment';
                    quantity: number;
                    reference_id?: string | null;
                    reference_type?: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer' | null;
                    reason?: string | null;
                    performed_by: string;
                    created_at?: string;
                };
                Update: {
                    medicine_id?: string;
                    batch_id?: string;
                    movement_type?: 'in' | 'out' | 'adjustment';
                    quantity?: number;
                    reference_id?: string | null;
                    reference_type?: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer' | null;
                    reason?: string | null;
                };
            };

            // Alerts
            alerts: {
                Row: {
                    id: string;
                    type: 'low_stock' | 'expiry_warning' | 'expiry_critical' | 'out_of_stock' | 'demand_spike' | 'price_surge' | 'dead_stock' | 'reorder_suggestion';
                    severity: 'info' | 'warning' | 'critical';
                    title: string;
                    message: string;
                    medicine_id: string | null;
                    batch_id: string | null;
                    data: Json | null;
                    is_read: boolean;
                    is_resolved: boolean;
                    resolved_by: string | null;
                    resolved_at: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    type: 'low_stock' | 'expiry_warning' | 'expiry_critical' | 'out_of_stock' | 'demand_spike' | 'price_surge' | 'dead_stock' | 'reorder_suggestion';
                    severity?: 'info' | 'warning' | 'critical';
                    title: string;
                    message: string;
                    medicine_id?: string | null;
                    batch_id?: string | null;
                    data?: Json | null;
                    is_read?: boolean;
                    is_resolved?: boolean;
                    resolved_by?: string | null;
                    resolved_at?: string | null;
                    created_at?: string;
                };
                Update: {
                    type?: 'low_stock' | 'expiry_warning' | 'expiry_critical' | 'out_of_stock' | 'demand_spike' | 'price_surge' | 'dead_stock' | 'reorder_suggestion';
                    severity?: 'info' | 'warning' | 'critical';
                    title?: string;
                    message?: string;
                    medicine_id?: string | null;
                    batch_id?: string | null;
                    data?: Json | null;
                    is_read?: boolean;
                    is_resolved?: boolean;
                    resolved_by?: string | null;
                    resolved_at?: string | null;
                };
            };

            // Forecast Results
            forecast_results: {
                Row: {
                    id: string;
                    medicine_id: string;
                    forecast_date: string;
                    period_start: string;
                    period_end: string;
                    forecasted_demand: number;
                    confidence_level: number;
                    method: 'moving_average' | 'exponential_smoothing' | 'seasonal_adjustment' | 'ml_prophet' | 'ml_lstm';
                    seasonal_factor: number | null;
                    trend_direction: 'up' | 'down' | 'stable' | null;
                    recommended_reorder_qty: number;
                    reasoning: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    medicine_id: string;
                    forecast_date?: string;
                    period_start: string;
                    period_end: string;
                    forecasted_demand: number;
                    confidence_level?: number;
                    method?: 'moving_average' | 'exponential_smoothing' | 'seasonal_adjustment' | 'ml_prophet' | 'ml_lstm';
                    seasonal_factor?: number | null;
                    trend_direction?: 'up' | 'down' | 'stable' | null;
                    recommended_reorder_qty: number;
                    reasoning?: string | null;
                    created_at?: string;
                };
                Update: {
                    medicine_id?: string;
                    forecast_date?: string;
                    period_start?: string;
                    period_end?: string;
                    forecasted_demand?: number;
                    confidence_level?: number;
                    method?: 'moving_average' | 'exponential_smoothing' | 'seasonal_adjustment' | 'ml_prophet' | 'ml_lstm';
                    seasonal_factor?: number | null;
                    trend_direction?: 'up' | 'down' | 'stable' | null;
                    recommended_reorder_qty?: number;
                    reasoning?: string | null;
                };
            };

            // Seasonal Patterns
            seasonal_patterns: {
                Row: {
                    id: string;
                    medicine_id: string;
                    season: 'monsoon' | 'winter' | 'summer' | 'flu_season' | 'festival';
                    multiplier: number;
                    notes: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    medicine_id: string;
                    season: 'monsoon' | 'winter' | 'summer' | 'flu_season' | 'festival';
                    multiplier: number;
                    notes?: string | null;
                    created_at?: string;
                };
                Update: {
                    medicine_id?: string;
                    season?: 'monsoon' | 'winter' | 'summer' | 'flu_season' | 'festival';
                    multiplier?: number;
                    notes?: string | null;
                };
            };

            // Price History (for price surge detection)
            price_history: {
                Row: {
                    id: string;
                    medicine_id: string;
                    supplier_id: string | null;
                    cost_price: number;
                    selling_price: number;
                    recorded_at: string;
                };
                Insert: {
                    id?: string;
                    medicine_id: string;
                    supplier_id?: string | null;
                    cost_price: number;
                    selling_price: number;
                    recorded_at?: string;
                };
                Update: {
                    medicine_id?: string;
                    supplier_id?: string | null;
                    cost_price?: number;
                    selling_price?: number;
                    recorded_at?: string;
                };
            };
        };

        Views: {
            // View for medicine with total stock from batches
            medicines_with_stock: {
                Row: {
                    id: string;
                    name: string;
                    generic_name: string | null;
                    category_id: string;
                    category_name: string | null;
                    sku: string;
                    barcode: string | null;
                    dosage_form: string | null;
                    requires_prescription: boolean | null;
                    is_active: boolean | null;
                    max_stock_level: number | null;
                    total_stock: number;
                    reorder_level: number;
                    is_low_stock: boolean;
                    is_out_of_stock: boolean | null;
                };
            };

            // View for batches expiring soon
            expiring_batches: {
                Row: {
                    id: string;
                    medicine_id: string;
                    medicine_name: string;
                    batch_number: string;
                    expiry_date: string;
                    quantity: number;
                    days_until_expiry: number;
                    expiry_status: 'safe' | 'warning' | 'critical' | 'expired';
                };
            };
        };

        Functions: {
            // FEFO: Get next batch to sell for a medicine
            get_fefo_batch: {
                Args: { medicine_id: string; required_quantity: number };
                Returns: { batch_id: string; available_quantity: number }[];
            };

            // Calculate medicine total stock
            get_medicine_stock: {
                Args: { medicine_id: string };
                Returns: number;
            };

            // Generate forecasts for all medicines
            generate_forecasts: {
                Args: Record<string, never>;
                Returns: void;
            };

            // Check and create alerts
            check_inventory_alerts: {
                Args: Record<string, never>;
                Returns: void;
            };
        };

        Enums: {
            user_role: 'admin' | 'pharmacist' | 'staff';
            dosage_form: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'ointment' | 'drops' | 'inhaler' | 'powder' | 'suspension' | 'other';
            batch_status: 'active' | 'depleted' | 'expired' | 'returned' | 'damaged';
            payment_method: 'cash' | 'card' | 'upi' | 'credit';
            payment_status: 'paid' | 'pending' | 'partial' | 'refunded';
            movement_type: 'in' | 'out' | 'adjustment';
            alert_type: 'low_stock' | 'expiry_warning' | 'expiry_critical' | 'out_of_stock' | 'demand_spike' | 'price_surge' | 'dead_stock' | 'reorder_suggestion';
            alert_severity: 'info' | 'warning' | 'critical';
            forecast_method: 'moving_average' | 'exponential_smoothing' | 'seasonal_adjustment' | 'ml_prophet' | 'ml_lstm';
            season: 'monsoon' | 'winter' | 'summer' | 'flu_season' | 'festival';
        };
    };
};

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Convenience type aliases
export type Profile = Tables<'profiles'>;
export type Category = Tables<'categories'>;
export type Supplier = Tables<'suppliers'>;
export type Medicine = Tables<'medicines'>;
export type Batch = Tables<'batches'>;
export type Sale = Tables<'sales'>;
export type SaleItem = Tables<'sale_items'>;
export type StockMovement = Tables<'stock_movements'>;
export type Alert = Tables<'alerts'>;
export type ForecastResult = Tables<'forecast_results'>;
export type SeasonalPattern = Tables<'seasonal_patterns'>;
export type PriceHistory = Tables<'price_history'>;
