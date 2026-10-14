ALTER TABLE `products`
  ADD COLUMN `brand` VARCHAR(120) NULL,
  ADD COLUMN `material` TEXT NULL,
  ADD COLUMN `size_guide` TEXT NULL,
  ADD COLUMN `variant_stocks` JSON NULL;
