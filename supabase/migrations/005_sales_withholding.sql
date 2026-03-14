-- Add withholding tax column for sales >= 20,000 ETB
-- Withholding = (total / 1.15) * 0.03
ALTER TABLE sales ADD COLUMN IF NOT EXISTS withholding_amount DECIMAL(12,2) DEFAULT NULL;
