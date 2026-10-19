-- Costo del producto (privado, para calcular la ganancia) y el costo guardado en cada venta.
-- Solo agrega columnas opcionales; no cambia datos existentes.
ALTER TABLE `products` ADD COLUMN `cost` DECIMAL(12, 2) NULL;
ALTER TABLE `order_items` ADD COLUMN `unit_cost` DECIMAL(12, 2) NULL;
ALTER TABLE `credit_sale_items` ADD COLUMN `unit_cost` DECIMAL(10, 2) NULL;
