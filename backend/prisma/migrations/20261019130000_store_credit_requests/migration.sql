-- Botón "Comprar al crédito" en la tienda virtual: apagado hasta que la dueña lo active.
ALTER TABLE `company_settings` ADD COLUMN `credit_requests` BOOLEAN NOT NULL DEFAULT false;
