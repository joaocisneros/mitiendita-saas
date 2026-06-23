CREATE TABLE `super_admin_audits` (
    `id` VARCHAR(191) NOT NULL,
    `super_admin_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NULL,
    `details` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `super_admin_audits_super_admin_id_created_at_idx`(`super_admin_id`, `created_at`),
    INDEX `super_admin_audits_company_id_created_at_idx`(`company_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `super_admin_audits`
ADD CONSTRAINT `super_admin_audits_super_admin_id_fkey`
FOREIGN KEY (`super_admin_id`) REFERENCES `super_admins`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;
