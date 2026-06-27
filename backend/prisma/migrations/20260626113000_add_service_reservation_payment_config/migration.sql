ALTER TABLE `products`
  ADD COLUMN `reservation_payment_mode` VARCHAR(20) NOT NULL DEFAULT 'optional',
  ADD COLUMN `reservation_advance_type` VARCHAR(20) NOT NULL DEFAULT 'percent',
  ADD COLUMN `reservation_advance_value` DECIMAL(10, 2) NOT NULL DEFAULT 30.00;
