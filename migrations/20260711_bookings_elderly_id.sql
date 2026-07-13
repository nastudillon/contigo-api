-- Migration: add elderly_id to bookings
-- Allows tracking which elderly person a booking is made for.
-- Nullable for backward compatibility with existing bookings.
-- New bookings from 'familiar' role are validated at application level.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS elderly_id INTEGER
  REFERENCES elderly_people(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_elderly ON bookings (elderly_id);
