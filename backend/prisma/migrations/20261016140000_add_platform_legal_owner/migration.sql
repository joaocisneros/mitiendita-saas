-- Datos del titular que exigen la Ley 29733 y el Código del Consumidor en
-- los Términos y la Política de privacidad (identidad, RUC y domicilio).
ALTER TABLE `platform_settings`
  ADD COLUMN `legal_name` VARCHAR(191) NULL,
  ADD COLUMN `legal_ruc` VARCHAR(11) NULL,
  ADD COLUMN `legal_address` VARCHAR(255) NULL;
