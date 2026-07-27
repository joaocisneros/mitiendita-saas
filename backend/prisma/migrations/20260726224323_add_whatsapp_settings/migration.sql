-- AlterTable
ALTER TABLE `platform_settings` ADD COLUMN `twilio_account_sid` VARCHAR(191) NULL,
    ADD COLUMN `twilio_auth_token` VARCHAR(191) NULL,
    ADD COLUMN `twilio_whatsapp_from` VARCHAR(191) NULL,
    ADD COLUMN `whatsapp_enabled` BOOLEAN NOT NULL DEFAULT false;
