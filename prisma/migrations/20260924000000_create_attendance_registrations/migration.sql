CREATE TABLE "attendance_registrations" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "whats_order_phone" VARCHAR(16) NOT NULL,
    "activity" VARCHAR(120) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "submission_key" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_registrations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attendance_registrations_full_name_check"
      CHECK (char_length(btrim("full_name")) BETWEEN 2 AND 120),
    CONSTRAINT "attendance_registrations_phone_check"
      CHECK ("whats_order_phone" ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT "attendance_registrations_activity_check"
      CHECK (char_length(btrim("activity")) BETWEEN 2 AND 120),
    CONSTRAINT "attendance_registrations_address_check"
      CHECK (char_length(btrim("address")) BETWEEN 10 AND 500)
);

CREATE UNIQUE INDEX "attendance_registrations_submission_key_key"
ON "attendance_registrations"("submission_key");

CREATE INDEX "attendance_registrations_phone_idx"
ON "attendance_registrations"("whats_order_phone");

CREATE INDEX "attendance_registrations_created_at_idx"
ON "attendance_registrations"("created_at");
