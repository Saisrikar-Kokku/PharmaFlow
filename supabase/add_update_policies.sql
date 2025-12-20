-- Add UPDATE policies for sales and sale_items tables

-- UPDATE policy for sales table (for customer details, payment method, total)
CREATE POLICY "Authenticated users can update sales"
ON sales
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- UPDATE policy for sale_items table (for quantity changes)
CREATE POLICY "Authenticated users can update sale_items"
ON sale_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
