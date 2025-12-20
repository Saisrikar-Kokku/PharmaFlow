-- ============================================
-- PRODUCTION-READY RLS POLICIES
-- Smart Pharmacy Inventory System
-- ============================================
-- Run this SQL when deploying to production to enable proper security

-- ============================================
-- STEP 0: CLEANUP (Remove insecure/legacy policies)
-- ============================================

-- Clean up Batches (CRITICAL: Remove generic update access)
DROP POLICY IF EXISTS "Authenticated users can update batches" ON batches;
DROP POLICY IF EXISTS "all_view_batches" ON batches;
DROP POLICY IF EXISTS "admin_pharmacist_create_batches" ON batches;
DROP POLICY IF EXISTS "admin_pharmacist_update_batches" ON batches;
DROP POLICY IF EXISTS "admin_pharmacist_delete_batches" ON batches;

-- Clean up Medicines
DROP POLICY IF EXISTS "all_view_medicines" ON medicines;
DROP POLICY IF EXISTS "admin_pharmacist_create_medicines" ON medicines;
DROP POLICY IF EXISTS "admin_pharmacist_update_medicines" ON medicines;
DROP POLICY IF EXISTS "admin_delete_medicines" ON medicines;

-- Clean up Sales & Items (CRITICAL: Remove generic write access)
DROP POLICY IF EXISTS "Authenticated users can create sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can delete sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can create sale items" ON sale_items;
DROP POLICY IF EXISTS "Authenticated users can update sale_items" ON sale_items;

DROP POLICY IF EXISTS "all_view_sales" ON sales;
DROP POLICY IF EXISTS "admin_pharmacist_create_sales" ON sales;
DROP POLICY IF EXISTS "all_view_sale_items" ON sale_items;
DROP POLICY IF EXISTS "admin_pharmacist_create_sale_items" ON sale_items;

-- Clean up Categories
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON categories;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON categories;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON categories;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON categories;

DROP POLICY IF EXISTS "all_view_categories" ON categories;
DROP POLICY IF EXISTS "admin_pharmacist_create_categories" ON categories;
DROP POLICY IF EXISTS "admin_pharmacist_update_categories" ON categories;
DROP POLICY IF EXISTS "admin_delete_categories" ON categories;

-- Clean up Suppliers
DROP POLICY IF EXISTS "all_view_suppliers" ON suppliers;
DROP POLICY IF EXISTS "admin_pharmacist_create_suppliers" ON suppliers;
DROP POLICY IF EXISTS "admin_pharmacist_update_suppliers" ON suppliers;
DROP POLICY IF EXISTS "admin_delete_suppliers" ON suppliers;

-- Clean up Stock Movements
DROP POLICY IF EXISTS "Authenticated users can create stock movements" ON stock_movements;
DROP POLICY IF EXISTS "all_view_stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "admin_pharmacist_create_stock_movements" ON stock_movements;

-- Clean up Alerts
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON alerts;
DROP POLICY IF EXISTS "Alerts are viewable by authenticated users" ON alerts;
DROP POLICY IF EXISTS "System can create alerts" ON alerts;
DROP POLICY IF EXISTS "all_view_alerts" ON alerts;
DROP POLICY IF EXISTS "service_create_alerts" ON alerts;
DROP POLICY IF EXISTS "admin_pharmacist_update_alerts" ON alerts;
DROP POLICY IF EXISTS "admin_delete_alerts" ON alerts;

-- Clean up Profiles
DROP POLICY IF EXISTS "allow_select" ON profiles;
DROP POLICY IF EXISTS "allow_insert" ON profiles;
DROP POLICY IF EXISTS "allow_update" ON profiles;
DROP POLICY IF EXISTS "allow_delete" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

DROP POLICY IF EXISTS "users_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admins_view_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admins_update_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admins_delete_profiles" ON profiles;
DROP POLICY IF EXISTS "service_insert_profiles" ON profiles;

-- Clean up Missing Tables (Forecasts, Price History, Seasonal)
DROP POLICY IF EXISTS "Forecasts are viewable by authenticated users" ON forecast_results;
DROP POLICY IF EXISTS "Admins can manage forecasts" ON forecast_results;
DROP POLICY IF EXISTS "Price history is viewable by authenticated users" ON price_history;
DROP POLICY IF EXISTS "System can record price history" ON price_history;
DROP POLICY IF EXISTS "Seasonal patterns are viewable by authenticated users" ON seasonal_patterns;
DROP POLICY IF EXISTS "Admins and pharmacists can manage seasonal patterns" ON seasonal_patterns;

-- Clean up New Policy Names (ensure re-runnability)
DROP POLICY IF EXISTS "all_view_forecasts" ON forecast_results;
DROP POLICY IF EXISTS "admin_manage_forecasts" ON forecast_results;
DROP POLICY IF EXISTS "all_view_price_history" ON price_history;
DROP POLICY IF EXISTS "service_create_price_history" ON price_history;
DROP POLICY IF EXISTS "all_view_seasonal_patterns" ON seasonal_patterns;
DROP POLICY IF EXISTS "admin_pharmacist_manage_seasonal_patterns" ON seasonal_patterns;

-- Clean up Sales/Stock sentence-cased policies
DROP POLICY IF EXISTS "Sales are viewable by authenticated users" ON sales;
DROP POLICY IF EXISTS "Sale items are viewable by authenticated users" ON sale_items;
DROP POLICY IF EXISTS "Stock movements are viewable by authenticated users" ON stock_movements;


-- ============================================
-- STEP 1: Enable RLS on all tables
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_patterns ENABLE ROW LEVEL SECURITY;

-- ... [Existing policies 2-9 remain same] ...

-- ============================================
-- STEP 10: Forecast Results Policies
-- ============================================

-- Everyone can view forecasts
CREATE POLICY "all_view_forecasts" ON forecast_results
  FOR SELECT
  USING (true);

-- Admin can manage forecasts
CREATE POLICY "admin_manage_forecasts" ON forecast_results
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- STEP 11: Price History Policies
-- ============================================

-- Everyone can view price history
CREATE POLICY "all_view_price_history" ON price_history
  FOR SELECT
  USING (true);

-- System can create price history (service role)
CREATE POLICY "service_create_price_history" ON price_history
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- STEP 12: Seasonal Patterns Policies
-- ============================================

-- Everyone can view seasonal patterns
CREATE POLICY "all_view_seasonal_patterns" ON seasonal_patterns
  FOR SELECT
  USING (true);

-- Admin and Pharmacist can manage seasonal patterns
CREATE POLICY "admin_pharmacist_manage_seasonal_patterns" ON seasonal_patterns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- ============================================
-- HELPER FUNCTIONS (Prevent Infinite Recursion)
-- ============================================

-- Secure Helper Function to check Admin (Bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Secure Helper Function to check Admin OR Pharmacist
CREATE OR REPLACE FUNCTION public.is_admin_or_pharmacist()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'pharmacist')
  );
END;
$$;

-- ============================================
-- STEP 2: Profiles Table Policies
-- ============================================

-- Users can view their own profile
CREATE POLICY "users_view_own_profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (but not role)
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Only admins can view all profiles
CREATE POLICY "admins_view_all_profiles" ON profiles
  FOR SELECT
  USING (is_admin());

-- Only admins can update any profile (including roles)
CREATE POLICY "admins_update_all_profiles" ON profiles
  FOR UPDATE
  USING (is_admin());

-- Only admins can delete profiles
CREATE POLICY "admins_delete_profiles" ON profiles
  FOR DELETE
  USING (is_admin());

-- Service role can insert profiles (for signup trigger)
CREATE POLICY "service_insert_profiles" ON profiles
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- STEP 3: Medicines Table Policies
-- ============================================

-- Everyone can view medicines
CREATE POLICY "all_view_medicines" ON medicines
  FOR SELECT
  USING (true);

-- Admin and Pharmacist can create medicines
CREATE POLICY "admin_pharmacist_create_medicines" ON medicines
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- Admin and Pharmacist can update medicines
CREATE POLICY "admin_pharmacist_update_medicines" ON medicines
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- Only Admin can delete medicines
CREATE POLICY "admin_delete_medicines" ON medicines
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- STEP 4: Batches Table Policies
-- ============================================

-- Everyone can view batches
CREATE POLICY "all_view_batches" ON batches
  FOR SELECT
  USING (true);

-- Admin and Pharmacist can create batches
CREATE POLICY "admin_pharmacist_create_batches" ON batches
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- Admin and Pharmacist can update batches
CREATE POLICY "admin_pharmacist_update_batches" ON batches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- Admin and Pharmacist can delete batches
CREATE POLICY "admin_pharmacist_delete_batches" ON batches
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- ============================================
-- STEP 5: Suppliers Table Policies
-- ============================================

-- Everyone can view suppliers
CREATE POLICY "all_view_suppliers" ON suppliers
  FOR SELECT
  USING (true);

-- Admin and Pharmacist can create suppliers
CREATE POLICY "admin_pharmacist_create_suppliers" ON suppliers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- Admin and Pharmacist can update suppliers
CREATE POLICY "admin_pharmacist_update_suppliers" ON suppliers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- Only Admin can delete suppliers
CREATE POLICY "admin_delete_suppliers" ON suppliers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- STEP 6: Categories Table Policies
-- ============================================

-- Everyone can view categories
CREATE POLICY "all_view_categories" ON categories
  FOR SELECT
  USING (true);

-- Admin and Pharmacist can create categories
CREATE POLICY "admin_pharmacist_create_categories" ON categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- Admin and Pharmacist can update categories
CREATE POLICY "admin_pharmacist_update_categories" ON categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- Only Admin can delete categories
CREATE POLICY "admin_delete_categories" ON categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- STEP 7: Sales & Related Tables Policies
-- ============================================

-- Everyone can view sales
CREATE POLICY "all_view_sales" ON sales
  FOR SELECT
  USING (true);

-- Admin and Pharmacist can create sales
CREATE POLICY "admin_pharmacist_create_sales" ON sales
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- Everyone can view sale items
CREATE POLICY "all_view_sale_items" ON sale_items
  FOR SELECT
  USING (true);

-- Admin and Pharmacist can create sale items
CREATE POLICY "admin_pharmacist_create_sale_items" ON sale_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- ============================================
-- STEP 8: Stock Movements Policies
-- ============================================

-- Everyone can view stock movements
CREATE POLICY "all_view_stock_movements" ON stock_movements
  FOR SELECT
  USING (true);

-- Admin and Pharmacist can create stock movements
CREATE POLICY "admin_pharmacist_create_stock_movements" ON stock_movements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- ============================================
-- STEP 9: Alerts Policies
-- ============================================

-- Everyone can view alerts
CREATE POLICY "all_view_alerts" ON alerts
  FOR SELECT
  USING (true);

-- System can create alerts (service role)
CREATE POLICY "service_create_alerts" ON alerts
  FOR INSERT
  WITH CHECK (true);

-- Admin and Pharmacist can update alerts (mark as read)
CREATE POLICY "admin_pharmacist_update_alerts" ON alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist')
    )
  );

-- Admin can delete alerts
CREATE POLICY "admin_delete_alerts" ON alerts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check all policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- NOTES
-- ============================================
-- 
-- Role Hierarchy:
-- - admin: Full access to everything
-- - pharmacist: Can manage inventory, sales, but cannot change roles
-- - staff: View-only access (future implementation)
-- 
-- Security Model:
-- - All users can VIEW data (transparency)
-- - Only admin/pharmacist can MODIFY inventory
-- - Only admin can DELETE critical data
-- - Only admin can manage user roles
-- 
-- Service Role:
-- - Used for signup trigger (auto-create profiles)
-- - Used for system-generated alerts
--
