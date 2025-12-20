-- Add missing status column to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- Add check constraint for valid status values
ALTER TABLE sales DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE sales ADD CONSTRAINT valid_status 
  CHECK (status IN ('completed', 'pending', 'refunded', 'cancelled'));

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name = 'status';
