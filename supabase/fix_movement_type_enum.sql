-- Fix stock_movements enum to include 'sale' type
-- First, check current enum values
SELECT unnest(enum_range(NULL::movement_type));

-- Add 'sale' to the enum if it doesn't exist
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'sale';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'purchase';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'adjustment';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'return';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'expired';

-- Verify
SELECT unnest(enum_range(NULL::movement_type));
