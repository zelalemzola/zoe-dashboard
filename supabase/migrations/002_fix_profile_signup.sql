-- Fix "Database error saving new user"
-- The handle_new_user trigger runs during signup, before the user is "authenticated".
-- The RLS policy only allowed authenticated users, so the trigger's INSERT was blocked.
-- This adds a policy to allow profile creation during signup.

-- Drop the restrictive policy on profiles
DROP POLICY IF EXISTS "Authenticated full access" ON profiles;

-- Create separate policies: allow INSERT during signup (trigger runs as non-authenticated),
-- and require authenticated for read/update/delete
CREATE POLICY "Allow profile insert on signup" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated read update delete" ON profiles
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
