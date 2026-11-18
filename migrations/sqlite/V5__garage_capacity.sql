CREATE TABLE IF NOT EXISTS garage_settings
(
    id       INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    capacity INTEGER NOT NULL CHECK (capacity >= 1)
);

INSERT OR IGNORE INTO garage_settings (id, capacity) VALUES (1, 1);
