-- Precio normal del producto al momento de la venta al crédito (para mostrar rebajas o aumentos).
-- Solo agrega una columna opcional; las ventas anteriores quedan sin él.
ALTER TABLE `credit_sale_items` ADD COLUMN `list_price` DECIMAL(10, 2) NULL;
