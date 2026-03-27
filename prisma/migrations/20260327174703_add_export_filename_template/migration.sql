-- AlterTable
ALTER TABLE "User" ADD COLUMN     "exportFileNameTemplate" TEXT DEFAULT '{project}-{from}-{to}';
