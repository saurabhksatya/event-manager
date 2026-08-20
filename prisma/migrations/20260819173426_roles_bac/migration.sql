/*
  Warnings:

  - You are about to drop the `_EventAdmins` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_EventAdmins" DROP CONSTRAINT "_EventAdmins_A_fkey";

-- DropForeignKey
ALTER TABLE "_EventAdmins" DROP CONSTRAINT "_EventAdmins_B_fkey";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "banExpires" TIMESTAMPTZ(3),
ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "banned" BOOLEAN,
ADD COLUMN     "role" TEXT;

-- DropTable
DROP TABLE "_EventAdmins";
