-- Fix invoice_number column - Simplified version

-- Step 1: Make invoice_number nullable
ALTER TABLE sales ALTER COLUMN invoice_number DROP NOT NULL;

-- Step 2: Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1;

-- Step 3: Set default to auto-generate invoice numbers (format: INV-2025-000001)
ALTER TABLE sales ALTER COLUMN invoice_number 
SET DEFAULT 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');

-- Step 4: Update existing NULL values (if any) - FIXED VERSION
UPDATE sales 
SET invoice_number = 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(id::TEXT, 6, '0')
WHERE invoice_number IS NULL;

-- Verify
SELECT column_name, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name = 'invoice_number';
