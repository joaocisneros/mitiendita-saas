-- DropForeignKey
ALTER TABLE `fraud_reports` DROP FOREIGN KEY `fraud_reports_company_id_fkey`;

-- AlterTable
ALTER TABLE `api_tokens` ADD COLUMN `requested_scopes` JSON NOT NULL,
    ADD COLUMN `review_note` VARCHAR(300) NULL,
    ADD COLUMN `reviewed_at` DATETIME(3) NULL,
    ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    MODIFY `token_hash` VARCHAR(191) NULL,
    MODIFY `token_prefix` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `fraud_reports`;

-- CreateIndex
CREATE INDEX `api_tokens_status_idx` ON `api_tokens`(`status`);
