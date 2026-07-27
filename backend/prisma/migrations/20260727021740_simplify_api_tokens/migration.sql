-- DropIndex
DROP INDEX `api_tokens_status_idx` ON `api_tokens`;

-- AlterTable
ALTER TABLE `api_tokens` DROP COLUMN `requested_scopes`,
    DROP COLUMN `review_note`,
    DROP COLUMN `reviewed_at`,
    DROP COLUMN `status`,
    MODIFY `token_hash` VARCHAR(191) NOT NULL,
    MODIFY `token_prefix` VARCHAR(191) NOT NULL;
