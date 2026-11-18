CREATE TABLE IF NOT EXISTS total_revenue
(
    id            TEXT PRIMARY KEY,
    total_revenue REAL    NOT NULL DEFAULT 0,
    payments      INTEGER NOT NULL DEFAULT 0,
    as_of         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
