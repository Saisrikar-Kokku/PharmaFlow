-- Add missing pharmacy-standard fields to medicines table

-- Add manufacturer field
ALTER TABLE medicines 
ADD COLUMN IF NOT EXISTS manufacturer TEXT;

-- Add HSN code for tax classification
ALTER TABLE medicines 
ADD COLUMN IF NOT EXISTS hsn_code TEXT;

-- Add notes/remarks field  
ALTER TABLE medicines
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for HSN code lookups
CREATE INDEX IF NOT EXISTS idx_medicines_hsn_code ON medicines(hsn_code);

-- Verify new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'medicines' 
AND column_name IN ('manufacturer', 'hsn_code', 'notes')
ORDER BY column_name;
