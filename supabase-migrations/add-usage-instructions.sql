-- Add usage_instructions column to medicines table
ALTER TABLE medicines 
ADD COLUMN IF NOT EXISTS usage_instructions TEXT;

COMMENT ON COLUMN medicines.usage_instructions IS 'Standard dosage/usage instructions for the medicine (e.g., Twice daily after food)';
