-- Lo que incluye cada plan. Todo empieza activado para no quitarle nada a las tiendas actuales.
ALTER TABLE `plans` ADD COLUMN `max_images` INTEGER NOT NULL DEFAULT 12;
ALTER TABLE `plans` ADD COLUMN `feat_excel` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `plans` ADD COLUMN `feat_credits` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `plans` ADD COLUMN `feat_seo` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `plans` ADD COLUMN `feat_priority_support` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `plans` ADD COLUMN `feat_setup` BOOLEAN NOT NULL DEFAULT false;
