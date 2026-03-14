-- Add bulk pricing for provider products
-- bulk_min_quantity: minimum quantity to qualify for bulk price (e.g. 100 = 100+ gets bulk price)
-- bulk_price: price per unit when quantity >= bulk_min_quantity
ALTER TABLE provider_prices ADD COLUMN IF NOT EXISTS bulk_price DECIMAL(12,2) DEFAULT NULL;
ALTER TABLE provider_prices ADD COLUMN IF NOT EXISTS bulk_min_quantity DECIMAL(12,2) DEFAULT NULL;
