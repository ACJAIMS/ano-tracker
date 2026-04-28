-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  category_color TEXT,
  svrha TEXT,
  cilj TEXT,
  tim TEXT[],
  start_date TEXT,
  end_date TEXT,
  trajanje TEXT,
  napomene TEXT DEFAULT '',
  ukupni_status TEXT DEFAULT 'nije_zapoceto',
  na_potezu JSONB,
  linkovi JSONB DEFAULT '[]',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Faze table
CREATE TABLE IF NOT EXISTS project_faze (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  naziv TEXT NOT NULL,
  status TEXT DEFAULT 'nije_zapoceto',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_faze_project_id ON project_faze(project_id);

-- Enable Row Level Security (optional - for future multi-user)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_faze ENABLE ROW LEVEL SECURITY;

-- Policy for anonymous access (adjust for your needs)
CREATE POLICY "Allow public access" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON project_faze FOR ALL USING (true) WITH CHECK (true);