-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "ViewPreference" AS ENUM ('WEEK', 'MONTH');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultProjectId" TEXT,
ADD COLUMN     "preferredView" "ViewPreference" NOT NULL DEFAULT 'WEEK',
ADD COLUMN     "themePreference" "ThemePreference" NOT NULL DEFAULT 'SYSTEM';

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultProjectId_fkey" FOREIGN KEY ("defaultProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
