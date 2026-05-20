-- Notes table: core storage for encrypted notes
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    outgoing_links TEXT NOT NULL DEFAULT '[]',  -- JSON array of linked note IDs
    tags TEXT NOT NULL DEFAULT '[]',             -- JSON array of tags
    content_hash TEXT NOT NULL,                  -- For detecting client changes
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Note embeddings: for semantic search via DeepSeek embeddings
CREATE TABLE note_embeddings (
    note_id TEXT PRIMARY KEY REFERENCES notes(id) ON DELETE CASCADE,
    embedding BLOB NOT NULL,                     -- Binary embedding vector
    embedded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX idx_notes_title ON notes(title);
