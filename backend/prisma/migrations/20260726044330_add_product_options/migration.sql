-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `variant` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `colors` TEXT NULL,
    ADD COLUMN `sizes` TEXT NULL;
