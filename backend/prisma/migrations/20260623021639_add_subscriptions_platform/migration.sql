-- AlterTable
ALTER TABLE `companies` ADD COLUMN `current_period_ends_at` DATETIME(3) NULL,
    ADD COLUMN `subscription_notes` TEXT NULL,
    ADD COLUMN `subscription_status` ENUM('trial', 'active', 'past_due', 'cancelled') NOT NULL DEFAULT 'trial';

-- CreateTable
CREATE TABLE `platform_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `platform_name` VARCHAR(191) NOT NULL DEFAULT 'MiTiendita',
    `logo_url` VARCHAR(191) NULL,
    `main_domain` VARCHAR(191) NOT NULL DEFAULT 'mitiendita.com',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'PEN',
    `support_whatsapp` VARCHAR(191) NULL,
    `support_email` VARCHAR(191) NULL,
    `terms` TEXT NULL,
    `privacy` TEXT NULL,
    `trial_days` INTEGER NOT NULL DEFAULT 14,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
