-- Create checklists table
CREATE TABLE IF NOT EXISTS checklists (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  assignee VARCHAR(255) NOT NULL,
  doer_name VARCHAR(255),
  priority VARCHAR(50) DEFAULT 'medium',
  department VARCHAR(255),
  verification_required BOOLEAN DEFAULT false,
  verifier_name VARCHAR(255),
  attachment_required BOOLEAN DEFAULT false,
  frequency VARCHAR(50) NOT NULL, -- Daily, Weekly, Monthly, Quarterly, Yearly
  from_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, planned, overdue, completed
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_checklists_assignee ON checklists(assignee);
CREATE INDEX IF NOT EXISTS idx_checklists_status ON checklists(status);
CREATE INDEX IF NOT EXISTS idx_checklists_due_date ON checklists(due_date);
CREATE INDEX IF NOT EXISTS idx_checklists_frequency ON checklists(frequency);
