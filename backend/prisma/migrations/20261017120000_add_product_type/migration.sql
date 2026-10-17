-- Tipo de producto del formulario (ropa, calzado, anillos…). Solo agrega una columna opcional.
ALTER TABLE `products` ADD COLUMN `product_type` VARCHAR(20) NULL;
