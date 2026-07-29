-- AlterTable
ALTER TABLE `subscriptions` ADD COLUMN `renewal_months` INTEGER NULL,
    ADD COLUMN `renewal_proof_url` VARCHAR(191) NULL,
    ADD COLUMN `renewal_submitted_at` DATETIME(3) NULL,
    ADD COLUMN `renewal_operation_number` VARCHAR(191) NULL,
    ADD COLUMN `renewal_detected_method` VARCHAR(191) NULL;
