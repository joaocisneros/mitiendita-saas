-- AlterTable
ALTER TABLE `appointments` ADD COLUMN `rejection_comment` VARCHAR(191) NULL,
    ADD COLUMN `validated_at` DATETIME(3) NULL,
    ADD COLUMN `validated_by_user_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `subscriptions` ADD COLUMN `price` DECIMAL(12, 2) NULL;
