-- AlterTable
ALTER TABLE `appointments` ADD COLUMN `public_code` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `appointments_public_code_key` ON `appointments`(`public_code`);
