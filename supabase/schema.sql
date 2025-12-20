-- ============================================
-- Smart Pharmacy Inventory - Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'pharmacist', 'staff');
CREATE TYPE dosage_form AS ENUM ('tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'powder', 'suspension', 'other');
CREATE TYPE batch_status AS ENUM ('active', 'depleted', 'expired', 'returned', 'damaged');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'upi', 'credit');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'partial', 'refunded');
CREATE TYPE movement_type AS ENUM ('in', 'out', 'adjustment');
CREATE TYPE alert_type AS ENUM ('low_stock', 'expiry_warning', 'expiry_critical', 'out_of_stock', 'demand_spike', 'price_surge', 'dead_stock', 'reorder_suggestion');
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE forecast_method AS ENUM ('moving_average', 'exponential_smoothing', 'seasonal_adjustment', 'ml_prophet', 'ml_lstm');
CREATE TYPE season_type AS ENUM ('monsoon', 'winter', 'summer', 'flu_season', 'festival');

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- CATEGORIES
-- ============================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, description, icon, color) VALUES
  ('Antibiotics', 'Medicines that fight bacterial infections', 'pill', '#ef4444'),
  ('Painkillers', 'Pain relief medications', 'activity', '#f97316'),
  ('Vitamins & Supplements', 'Nutritional supplements', 'heart', '#22c55e'),
  ('Cold & Flu', 'Remedies for cold and flu symptoms', 'thermometer', '#3b82f6'),
  ('Digestive Health', 'Medicines for digestive issues', 'cookie', '#a855f7'),
  ('Diabetes Care', 'Insulin and diabetes management', 'droplet', '#06b6d4'),
  ('Cardiovascular', 'Heart and blood pressure medicines', 'heart-pulse', '#ec4899'),
  ('Skin Care', 'Dermatological products', 'sparkles', '#f59e0b'),
  ('First Aid', 'Basic medical supplies', 'plus', '#10b981'),
  ('Baby Care', 'Pediatric medicines and products', 'baby', '#8b5cf6');

-- ============================================
-- SUPPLIERS
-- ============================================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER DEFAULT 7,
  rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- MEDICINES
-- ============================================

CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  generic_name TEXT,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT UNIQUE,
  description TEXT,
  dosage_form dosage_form NOT NULL DEFAULT 'tablet',
  strength TEXT,
  unit TEXT NOT NULL DEFAULT 'units',
  reorder_level INTEGER NOT NULL DEFAULT 50,
  max_stock_level INTEGER NOT NULL DEFAULT 500,
  storage_conditions TEXT,
  requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
  is_controlled BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_medicines_category ON medicines(category_id);
CREATE INDEX idx_medicines_supplier ON medicines(supplier_id);
CREATE INDEX idx_medicines_sku ON medicines(sku);

-- ============================================
-- BATCHES (Critical for FEFO)
-- ============================================

CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
  batch_number TEXT NOT NULL,
  manufacturing_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  initial_quantity INTEGER NOT NULL CHECK (initial_quantity >= 0),
  cost_price DECIMAL(10,2) NOT NULL CHECK (cost_price >= 0),
  selling_price DECIMAL(10,2) NOT NULL CHECK (selling_price >= 0),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT,
  status batch_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_batch_per_medicine UNIQUE (medicine_id, batch_number),
  CONSTRAINT valid_dates CHECK (expiry_date > manufacturing_date)
);

-- Critical indexes for FEFO queries
CREATE INDEX idx_batches_medicine ON batches(medicine_id);
CREATE INDEX idx_batches_expiry ON batches(expiry_date);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_fefo ON batches(medicine_id, status, expiry_date) WHERE status = 'active';

-- ============================================
-- SALES
-- ============================================

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal DECIMAL(12,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  payment_status payment_status NOT NULL DEFAULT 'paid',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_created_by ON sales(created_by);

-- ============================================
-- SALE ITEMS
-- ============================================

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id),
  batch_id UUID NOT NULL REFERENCES batches(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_medicine ON sale_items(medicine_id);
CREATE INDEX idx_sale_items_batch ON sale_items(batch_id);

-- ============================================
-- STOCK MOVEMENTS
-- ============================================

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicine_id UUID NOT NULL REFERENCES medicines(id),
  batch_id UUID NOT NULL REFERENCES batches(id),
  movement_type movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  reason TEXT,
  performed_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_medicine ON stock_movements(medicine_id);
CREATE INDEX idx_stock_movements_batch ON stock_movements(batch_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);

-- ============================================
-- ALERTS
-- ============================================

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type alert_type NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_unread ON alerts(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_alerts_unresolved ON alerts(is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX idx_alerts_medicine ON alerts(medicine_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);

-- ============================================
-- FORECAST RESULTS
-- ============================================

CREATE TABLE forecast_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  forecasted_demand INTEGER NOT NULL,
  confidence_level DECIMAL(3,2) NOT NULL DEFAULT 0.80,
  method forecast_method NOT NULL DEFAULT 'moving_average',
  seasonal_factor DECIMAL(4,2),
  trend_direction TEXT CHECK (trend_direction IN ('up', 'down', 'stable')),
  recommended_reorder_qty INTEGER NOT NULL,
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forecast_medicine ON forecast_results(medicine_id);
CREATE INDEX idx_forecast_date ON forecast_results(forecast_date);

-- ============================================
-- SEASONAL PATTERNS
-- ============================================

CREATE TABLE seasonal_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  season season_type NOT NULL,
  multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (medicine_id, season)
);

-- ============================================
-- PRICE HISTORY (for surge detection)
-- ============================================

CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  cost_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_history_medicine ON price_history(medicine_id);
CREATE INDEX idx_price_history_date ON price_history(recorded_at);

-- ============================================
-- VIEWS
-- ============================================

-- Medicines with total stock from active batches
CREATE OR REPLACE VIEW medicines_with_stock AS
SELECT 
  m.id,
  m.name,
  m.generic_name,
  m.category_id,
  c.name as category_name,
  m.sku,
  m.dosage_form,
  m.reorder_level,
  m.is_active,
  COALESCE(SUM(b.quantity), 0)::INTEGER as total_stock,
  COALESCE(SUM(b.quantity), 0) < m.reorder_level as is_low_stock,
  COALESCE(SUM(b.quantity), 0) = 0 as is_out_of_stock
FROM medicines m
LEFT JOIN categories c ON m.category_id = c.id
LEFT JOIN batches b ON m.id = b.medicine_id AND b.status = 'active'
GROUP BY m.id, m.name, m.generic_name, m.category_id, c.name, m.sku, m.dosage_form, m.reorder_level, m.is_active;

-- Batches expiring soon
CREATE OR REPLACE VIEW expiring_batches AS
SELECT 
  b.id,
  b.medicine_id,
  m.name as medicine_name,
  b.batch_number,
  b.expiry_date,
  b.quantity,
  (b.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry,
  CASE 
    WHEN b.expiry_date <= CURRENT_DATE THEN 'expired'
    WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'critical'
    WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'warning'
    ELSE 'safe'
  END as expiry_status
FROM batches b
JOIN medicines m ON b.medicine_id = m.id
WHERE b.status = 'active'
ORDER BY b.expiry_date;

-- ============================================
-- FUNCTIONS
-- ============================================

-- FEFO: Get batches to fulfill order (First Expired First Out)
CREATE OR REPLACE FUNCTION get_fefo_batches(
  p_medicine_id UUID,
  p_required_quantity INTEGER
)
RETURNS TABLE (
  batch_id UUID,
  batch_number TEXT,
  available_quantity INTEGER,
  to_deduct INTEGER,
  expiry_date DATE
) AS $$
DECLARE
  remaining INTEGER := p_required_quantity;
  batch_rec RECORD;
BEGIN
  FOR batch_rec IN 
    SELECT b.id, b.batch_number, b.quantity, b.expiry_date
    FROM batches b
    WHERE b.medicine_id = p_medicine_id 
      AND b.status = 'active'
      AND b.quantity > 0
    ORDER BY b.expiry_date ASC
  LOOP
    IF remaining <= 0 THEN
      EXIT;
    END IF;
    
    batch_id := batch_rec.id;
    batch_number := batch_rec.batch_number;
    available_quantity := batch_rec.quantity;
    expiry_date := batch_rec.expiry_date;
    
    IF batch_rec.quantity >= remaining THEN
      to_deduct := remaining;
      remaining := 0;
    ELSE
      to_deduct := batch_rec.quantity;
      remaining := remaining - batch_rec.quantity;
    END IF;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Get total stock for a medicine
CREATE OR REPLACE FUNCTION get_medicine_stock(p_medicine_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(quantity), 0)::INTEGER
  FROM batches
  WHERE medicine_id = p_medicine_id AND status = 'active';
$$ LANGUAGE SQL;

-- Auto-update batch status when quantity reaches 0
CREATE OR REPLACE FUNCTION update_batch_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity = 0 AND NEW.status = 'active' THEN
    NEW.status := 'depleted';
  END IF;
  
  -- Check if expired
  IF NEW.expiry_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER batch_status_update
  BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION update_batch_status();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER medicines_updated_at
  BEFORE UPDATE ON medicines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Categories: All authenticated can read
CREATE POLICY "Categories are viewable by authenticated users" ON categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Suppliers: All authenticated can read
CREATE POLICY "Suppliers are viewable by authenticated users" ON suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and pharmacists can manage suppliers" ON suppliers
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pharmacist'))
  );

-- Medicines: All authenticated can read
CREATE POLICY "Medicines are viewable by authenticated users" ON medicines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and pharmacists can manage medicines" ON medicines
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pharmacist'))
  );

-- Batches: All authenticated can read
CREATE POLICY "Batches are viewable by authenticated users" ON batches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and pharmacists can manage batches" ON batches
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pharmacist'))
  );

-- Sales: All authenticated can read and create
CREATE POLICY "Sales are viewable by authenticated users" ON sales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create sales" ON sales
  FOR INSERT TO authenticated WITH CHECK (true);

-- Sale items follow sales policies
CREATE POLICY "Sale items are viewable by authenticated users" ON sale_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create sale items" ON sale_items
  FOR INSERT TO authenticated WITH CHECK (true);

-- Stock movements: All authenticated can view
CREATE POLICY "Stock movements are viewable by authenticated users" ON stock_movements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create stock movements" ON stock_movements
  FOR INSERT TO authenticated WITH CHECK (true);

-- Alerts: All authenticated can view and update
CREATE POLICY "Alerts are viewable by authenticated users" ON alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update alerts" ON alerts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "System can create alerts" ON alerts
  FOR INSERT TO authenticated WITH CHECK (true);

-- Forecast results: All authenticated can view
CREATE POLICY "Forecasts are viewable by authenticated users" ON forecast_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage forecasts" ON forecast_results
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seasonal patterns: All authenticated can view
CREATE POLICY "Seasonal patterns are viewable by authenticated users" ON seasonal_patterns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and pharmacists can manage seasonal patterns" ON seasonal_patterns
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pharmacist'))
  );

-- Price history: All authenticated can view
CREATE POLICY "Price history is viewable by authenticated users" ON price_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can record price history" ON price_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
