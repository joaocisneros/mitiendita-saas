-- Add proof fields for digital subscription payments.
ALTER TABLE `subscriptions`
    ADD COLUMN `proof_url` VARCHAR(191) NULL,
    ADD COLUMN `proof_submitted_at` DATETIME(3) NULL;
