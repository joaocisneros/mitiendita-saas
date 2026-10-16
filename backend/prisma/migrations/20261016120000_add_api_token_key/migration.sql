-- API Key pública para las integraciones (X-Api-Key + X-Api-Secret).
ALTER TABLE `api_tokens` ADD COLUMN `api_key` VARCHAR(191) NULL;

-- Los tokens que ya existen reciben su API Key; su token pasa a ser el secret.
UPDATE `api_tokens` SET `api_key` = CONCAT('mk_live_', REPLACE(UUID(), '-', '')) WHERE `api_key` IS NULL;

CREATE UNIQUE INDEX `api_tokens_api_key_key` ON `api_tokens`(`api_key`);
