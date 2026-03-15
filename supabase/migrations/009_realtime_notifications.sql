-- Enable Realtime for tables that affect notification counts (so the dashboard can push updates)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['tasks', 'task_assignees', 'leads', 'orders', 'sales', 'products'];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;
