-- Remove the unused registration lifecycle status.
ALTER TABLE "registration" DROP COLUMN "status";

DROP TYPE "registration_status";