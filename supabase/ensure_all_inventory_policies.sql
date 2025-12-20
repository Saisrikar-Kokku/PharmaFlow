-- Comprehensive RLS Policies for Inventory Management
-- Run this to ensure all necessary permissions are in place for the new Add Medicine + Stock feature

-- MEDICINES TABLE POLICIES -----------------------------------------

-- 1. Allow viewing medicines
CREATE POLICY "Authenticated users can view medicines"
ON medicines FOR SELECT
TO authenticated
USING (true);

-- 2. Allow adding new medicines
CREATE POLICY "Authenticated users can insert medicines"
ON medicines FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Allow updating medicines (for Edit Medicine feature)
CREATE POLICY "Authenticated users can update medicines"
ON medicines FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Allow deleting medicines
CREATE POLICY "Authenticated users can delete medicines"
ON medicines FOR DELETE
TO authenticated
USING (true);


-- BATCHES TABLE POLICIES -------------------------------------------

-- 1. Allow viewing batches
CREATE POLICY "Authenticated users can view batches"
ON batches FOR SELECT
TO authenticated
USING (true);

-- 2. Allow adding new batches (for Add Stock and Initial Stock)
CREATE POLICY "Authenticated users can insert batches"
ON batches FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Allow updating batches (for Edit Batch feature)
CREATE POLICY "Authenticated users can update batches"
ON batches FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Allow deleting batches
CREATE POLICY "Authenticated users can delete batches"
ON batches FOR DELETE
TO authenticated
USING (true);
