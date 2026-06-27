ALTER TABLE `appointments`
  MODIFY `status` ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending';
