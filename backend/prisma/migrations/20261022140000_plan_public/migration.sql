-- Planes privados: no salen en la página de precios (el superadmin los asigna a mano).
ALTER TABLE `plans` ADD COLUMN `is_public` BOOLEAN NOT NULL DEFAULT true;
