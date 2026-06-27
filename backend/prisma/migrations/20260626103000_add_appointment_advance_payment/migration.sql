ALTER TABLE `appointments`
  ADD COLUMN `payment_mode` VARCHAR(20) NULL,
  ADD COLUMN `advance_amount` DECIMAL(12, 2) NULL,
  ADD COLUMN `payment_status` ENUM('pending', 'proof_submitted', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN `proof_url` VARCHAR(191) NULL,
  ADD COLUMN `proof_submitted_at` DATETIME(3) NULL;
