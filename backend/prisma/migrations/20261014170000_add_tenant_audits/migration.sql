CREATE TABLE `tenant_audits` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `actor_name` VARCHAR(191) NOT NULL,
    `actor_email` VARCHAR(191) NOT NULL,
    `actor_role` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NULL,
    `result` VARCHAR(191) NOT NULL DEFAULT 'success',
    `details` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tenant_audits_company_id_created_at_idx`(`company_id`, `created_at`),
    INDEX `tenant_audits_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `tenant_audits_action_created_at_idx`(`action`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
