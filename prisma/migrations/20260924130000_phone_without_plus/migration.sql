-- Store phone numbers as digits only (no leading '+').
-- Drop the old check first so UPDATE can rewrite values that no longer match it.
ALTER TABLE "attendance_registrations"
  DROP CONSTRAINT IF EXISTS "attendance_registrations_phone_check";

UPDATE "attendance_registrations"
SET "whats_order_phone" = LTRIM("whats_order_phone", '+')
WHERE "whats_order_phone" LIKE '+%';

ALTER TABLE "attendance_registrations"
  ADD CONSTRAINT "attendance_registrations_phone_check"
  CHECK ("whats_order_phone" ~ '^[1-9][0-9]{7,14}$');
