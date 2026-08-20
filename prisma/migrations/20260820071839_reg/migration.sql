/*
  Warnings:

  - You are about to drop the column `capacity` on the `event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "event" DROP COLUMN "capacity",
ADD COLUMN     "isRegistrationOpen" BOOLEAN NOT NULL DEFAULT true;
