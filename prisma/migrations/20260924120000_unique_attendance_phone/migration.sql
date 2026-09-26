-- Make WhatsOrder phone unique across attendance registrations.
DROP INDEX IF EXISTS "attendance_registrations_phone_idx";

CREATE UNIQUE INDEX "attendance_registrations_whats_order_phone_key"
ON "attendance_registrations"("whats_order_phone");
