-- Add withholding tax column for restocks >= 20,000 ETB
-- Withholding = (total / 1.15) * 0.03 - amount withheld from provider payment
ALTER TABLE restocks ADD COLUMN IF NOT EXISTS withholding_amount DECIMAL(12,2) DEFAULT NULL;
