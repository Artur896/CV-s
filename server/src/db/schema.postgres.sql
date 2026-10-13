CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'experiencia',
  status TEXT NOT NULL DEFAULT 'en_progreso',
  ai_calls_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  category TEXT NOT NULL,
  question_text TEXT NOT NULL,
  original_answer TEXT NOT NULL,
  professional_rewrite TEXT,
  rewrite_approved INTEGER NOT NULL DEFAULT 0,
  source_of_rewrite TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detected_skills (
  id TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  category TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'media',
  source TEXT NOT NULL DEFAULT 'rule',
  evidence_response_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cv_drafts (
  id TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL UNIQUE REFERENCES interviews(id) ON DELETE CASCADE,
  profile_summary TEXT,
  suggested_roles_json TEXT,
  generation_source TEXT NOT NULL DEFAULT 'template',
  status TEXT NOT NULL DEFAULT 'borrador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id TEXT PRIMARY KEY,
  interview_id TEXT,
  call_type TEXT NOT NULL,
  success INTEGER NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_responses_interview ON responses(interview_id);
CREATE INDEX IF NOT EXISTS idx_skills_interview ON detected_skills(interview_id);
CREATE INDEX IF NOT EXISTS idx_usage_created ON ai_usage_log(created_at);
