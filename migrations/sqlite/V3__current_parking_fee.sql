CREATE TABLE IF NOT EXISTS current_parking_fee
(
    ticket_id     TEXT PRIMARY KEY,
    license_plate TEXT NOT NULL,
    vehicle_type  TEXT NOT NULL,
    entered_at    TEXT NOT NULL
);
