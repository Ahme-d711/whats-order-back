CREATE TYPE "attendance_notification_kind" AS ENUM (
    'CONFIRMATION',
    'SCHEDULE_UPDATE',
    'REMINDER_24H',
    'REMINDER_1H',
    'START'
);

CREATE TYPE "attendance_notification_status" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED',
    'SKIPPED'
);

CREATE TABLE "attendance_broadcast" (
    "id" INTEGER NOT NULL,
    "starts_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "meeting_url" VARCHAR(2000),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_broadcast_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attendance_broadcast_singleton_check" CHECK ("id" = 1)
);

INSERT INTO "attendance_broadcast" ("id", "version", "updated_at")
VALUES (1, 0, CURRENT_TIMESTAMP);

CREATE TABLE "attendance_notifications" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "schedule_version" INTEGER NOT NULL,
    "kind" "attendance_notification_kind" NOT NULL,
    "status" "attendance_notification_status" NOT NULL,
    "error" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(3),

    CONSTRAINT "attendance_notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attendance_notifications_registration_id_fkey"
      FOREIGN KEY ("registration_id")
      REFERENCES "attendance_registrations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "attendance_notifications_registration_version_kind_key"
ON "attendance_notifications"("registration_id", "schedule_version", "kind");

CREATE INDEX "attendance_notifications_version_kind_idx"
ON "attendance_notifications"("schedule_version", "kind");
