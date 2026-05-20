-- Security events: motion detections from Blink cameras
CREATE TABLE security_events (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    timestamp TEXT NOT NULL,
    camera_id TEXT NOT NULL,
    confidence REAL NOT NULL,              -- 0.0-1.0
    thumbnail_url TEXT,                    -- S3 or local path
    narration TEXT,                        -- AI-generated narration (null until Phase 2)
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX idx_security_events_camera ON security_events(camera_id);

-- Clips table: migrated from Kageki's storage_manager.db
-- Stores reference to Blink cloud clips with local expiration tracking
CREATE TABLE clips (
    id TEXT PRIMARY KEY,
    camera_id TEXT NOT NULL,
    clip_id TEXT NOT NULL,                 -- Blink clip ID
    s3_url TEXT NOT NULL,                  -- Blink S3 URL
    local_path TEXT,                       -- If downloaded locally
    file_size_mb INTEGER,
    duration_seconds INTEGER,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,              -- Blink auto-deletes after ~24h
    downloaded_at TEXT,
    is_favorite INTEGER DEFAULT 0,
    notes TEXT
);

CREATE INDEX idx_clips_camera ON clips(camera_id);
CREATE INDEX idx_clips_expires_at ON clips(expires_at);
