-- Zoe Coffee Distribution - Initial Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'kg',
  quantity DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact TEXT,
  address TEXT,
  payment_type TEXT NOT NULL DEFAULT 'on_delivery' CHECK (payment_type IN ('on_delivery', 'credit')),
  credit_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer-specific product prices
CREATE TABLE customer_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- Providers/Suppliers
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact TEXT,
  address TEXT,
  payment_type TEXT NOT NULL DEFAULT 'on_delivery' CHECK (payment_type IN ('on_delivery', 'credit')),
  credit_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider product prices
CREATE TABLE provider_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, product_id)
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  delivery_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'cancelled')),
  payment_type TEXT DEFAULT 'on_delivery' CHECK (payment_type IN ('on_delivery', 'credit')),
  credit_days INTEGER DEFAULT 0,
  credit_due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales (created when order is delivered)
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  sale_date DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  receipt_given BOOLEAN DEFAULT FALSE,
  withholding_received BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  credit_due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sale items
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restocks (inventory incoming)
CREATE TABLE restocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  restock_date DATE NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  receipt_received BOOLEAN DEFAULT FALSE,
  withholding_issued BOOLEAN DEFAULT FALSE,
  credit_due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id),
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Costs
CREATE TABLE costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('recurring', 'one_time')),
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_sale_date ON sales(sale_date);
CREATE INDEX idx_sales_completed ON sales(completed_at);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_restocks_provider ON restocks(provider_id);
CREATE INDEX idx_restocks_date ON restocks(restock_date);
CREATE INDEX idx_costs_date ON costs(date);
CREATE INDEX idx_costs_type ON costs(type);
CREATE INDEX idx_customer_prices_customer ON customer_prices(customer_id);
CREATE INDEX idx_customer_prices_product ON customer_prices(product_id);
CREATE INDEX idx_provider_prices_provider ON provider_prices(provider_id);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (adjust for your team)
CREATE POLICY "Authenticated full access" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON customer_prices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON providers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON provider_prices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON order_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON sales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON sale_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON restocks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON costs FOR ALL USING (auth.role() = 'authenticated');

-- Trigger: Create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function: Update inventory on restock
CREATE OR REPLACE FUNCTION update_inventory_on_restock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET quantity = quantity + NEW.quantity, updated_at = NOW() WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_restock_created
  AFTER INSERT ON restocks
  FOR EACH ROW EXECUTE FUNCTION update_inventory_on_restock();

-- Function: Update inventory on sale (when sale is created)
CREATE OR REPLACE FUNCTION update_inventory_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET quantity = quantity - NEW.quantity, updated_at = NOW() WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_sale_item_created
  AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_on_sale();
