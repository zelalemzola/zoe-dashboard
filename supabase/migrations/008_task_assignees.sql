-- Group tasks: a task can have multiple assignees via task_assignees
CREATE TABLE IF NOT EXISTS task_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON task_assignees FOR ALL USING (auth.role() = 'authenticated');

-- Backfill: add existing single assignees into task_assignees
INSERT INTO task_assignees (task_id, user_id)
  SELECT id, assignee_id FROM tasks WHERE assignee_id IS NOT NULL
  ON CONFLICT (task_id, user_id) DO NOTHING;
