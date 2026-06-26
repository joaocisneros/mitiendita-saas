-- Código público corto para suscripciones/planes.
ALTER TABLE `subscriptions`
    ADD COLUMN `public_code` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `subscriptions_public_code_key` ON `subscriptions`(`public_code`);
