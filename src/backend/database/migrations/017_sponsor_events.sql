CREATE TABLE sponsor_events (
    event_id TEXT PRIMARY KEY,
    creative_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'open')),
    visitor_id TEXT NOT NULL,
    page_view_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (creative_id, event_type, visitor_id, page_view_id)
);
CREATE INDEX sponsor_events_created ON sponsor_events(created_at);
