CREATE TABLE IF NOT EXISTS cars_in_garage
(
    ticket_id     TEXT PRIMARY KEY,
    license_plate TEXT NOT NULL,
    vehicle_type  TEXT NOT NULL,
    entered_at    TEXT NOT NULL
);
