-- Consumo mensual de cada credencial de API.
ALTER TABLE `api_tokens` ADD COLUMN `calls_month` VARCHAR(7) NULL,
    ADD COLUMN `monthly_calls` INTEGER NOT NULL DEFAULT 0;
