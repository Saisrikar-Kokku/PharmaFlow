-- Fix all missing columns in sales table at once

-- 1. Make created_by nullable (will be set from auth context later)
ALTER TABLE sales ALTER COLUMN created_by DROP NOT NULL;

-- 2. Set default to current user (if available)
ALTER TABLE sales ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Alternative: Just make it nullable and handle in code
-- ALTER TABLE sales ALTER COLUMN created_by DROP NOT NULL;

-- Verify all columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;
