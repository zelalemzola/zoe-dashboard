-- Add role to profiles (admin, sales)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'sales'));

-- Update trigger to set role for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, 'sales');
  RETURN NEW;
END;
$$;

-- Make the first user admin (run after you have at least one user)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
    UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);
  END IF;
END $$;

-- Leads/Prospects table for sales team outreach
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_name TEXT NOT NULL,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'landed', 'failed')),
  follow_up_date DATE,
  wait_days INTEGER,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_date);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access leads" ON leads FOR ALL USING (auth.role() = 'authenticated');
