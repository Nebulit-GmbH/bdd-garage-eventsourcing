CREATE TABLE IF NOT EXISTS processor_dlq
(
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    processor_id TEXT NOT NULL,
    stream_id    TEXT NOT NULL,
    event        TEXT NOT NULL,
    error        TEXT NOT NULL,
    ingested_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
