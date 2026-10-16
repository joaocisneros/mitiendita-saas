CREATE TABLE `document_api_config` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'cismafact',
    `base_url` VARCHAR(191) NOT NULL DEFAULT 'https://cismafact.alwaysdata.net/api',
    `api_key_encrypted` TEXT NOT NULL,
    `api_secret_encrypted` TEXT NOT NULL,
    `api_key_last_four` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
