-- Web push subscriptions: store device endpoints for sending push notifications
CREATE TABLE push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL UNIQUE,         -- Push service endpoint URL
    p256dh TEXT NOT NULL,                  -- Public key for VAPID encryption
    auth TEXT NOT NULL,                    -- Auth secret for VAPID
    user_agent TEXT,                       -- Browser/device info for debugging
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT
);

CREATE INDEX idx_push_subscriptions_created ON push_subscriptions(created_at DESC);
