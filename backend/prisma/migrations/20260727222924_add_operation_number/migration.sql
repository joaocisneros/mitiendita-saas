-- AlterTable
ALTER TABLE `payments` ADD COLUMN `operation_number` VARCHAR(191) NULL,
    ADD COLUMN `detected_method` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `appointments` ADD COLUMN `operation_number` VARCHAR(191) NULL,
    ADD COLUMN `detected_method` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `subscriptions` ADD COLUMN `operation_number` VARCHAR(191) NULL,
    ADD COLUMN `detected_method` VARCHAR(191) NULL;
