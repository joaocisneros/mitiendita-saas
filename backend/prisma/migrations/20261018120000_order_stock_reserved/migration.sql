-- El stock se aparta solo al subir el comprobante. Los pedidos pendientes creados
-- antes de este cambio ya tenían su stock apartado desde el checkout.
ALTER TABLE `orders` ADD COLUMN `stock_reserved` BOOLEAN NOT NULL DEFAULT false;
UPDATE `orders` SET `stock_reserved` = true WHERE `status` = 'pending';
