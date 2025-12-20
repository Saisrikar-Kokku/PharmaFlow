-- Add preferences column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"notifications": {"push": true, "email": true, "low_stock": true, "expiry": true, "updates": false}}'::jsonb;

-- Update RLS to ensure users can update their own preferences (already covered by existing update policy)
-- But let's verify if we need specific check logic. The existing 'update own profile' should cover it.
