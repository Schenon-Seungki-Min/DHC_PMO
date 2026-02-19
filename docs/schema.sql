-- DHC_PMO Supabase Schema
-- Supabase > SQL Editor에서 실행

-- 1. Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  objective TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'on_hold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Threads
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  thread_type TEXT NOT NULL CHECK (thread_type IN ('negotiation', 'execution')),
  start_date DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('todo', 'active', 'in_progress', 'done', 'completed')),
  outcome_goal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee_id TEXT,
  start_date DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'completed', 'pending')),
  completed_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('pm', 'member', 'intern')),
  color TEXT DEFAULT '#374151',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Thread Assignments
CREATE TABLE IF NOT EXISTS thread_assignments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('lead', 'support')),
  grabbed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  note TEXT DEFAULT ''
);

-- 6. Stakeholders
CREATE TABLE IF NOT EXISTS stakeholders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('internal', 'external')),
  organization TEXT,
  department TEXT,
  contact_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Thread <-> Stakeholder 매핑
CREATE TABLE IF NOT EXISTS thread_stakeholders (
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  stakeholder_id TEXT NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  role_type TEXT,
  PRIMARY KEY (thread_id, stakeholder_id)
);

-- 8. Thread Templates
CREATE TABLE IF NOT EXISTS thread_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  thread_type TEXT NOT NULL CHECK (thread_type IN ('negotiation', 'execution')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Template Tasks
CREATE TABLE IF NOT EXISTS template_tasks (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES thread_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  day_offset INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium',
  "order" INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT ''
);

-- RLS 활성화 (service_role key가 bypass하므로 policy 불필요)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;
