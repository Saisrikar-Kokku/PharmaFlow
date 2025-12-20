-- Remove usage_instructions from medicines table (as it should be per-sale)
ALTER TABLE medicines DROP COLUMN IF EXISTS usage_instructions;

-- Add usage_instructions to sale_items table
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS usage_instructions TEXT;

COMMENT ON COLUMN sale_items.usage_instructions IS 'Specific usage instructions for this item in this specific sale';
