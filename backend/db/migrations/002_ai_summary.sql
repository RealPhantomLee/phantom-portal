-- Add AI-generated summaries to notes table
ALTER TABLE notes ADD COLUMN ai_summary TEXT;
ALTER TABLE notes ADD COLUMN ai_summary_generated_at TEXT;

-- Create index for querying notes with summaries
CREATE INDEX idx_notes_ai_summary ON notes(ai_summary) WHERE ai_summary IS NOT NULL;
