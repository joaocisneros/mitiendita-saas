-- Planes que pueden quitar "Hecho con MiTiendita" del pie de la tienda.
ALTER TABLE `plans` ADD COLUMN `feat_no_branding` BOOLEAN NOT NULL DEFAULT false;
