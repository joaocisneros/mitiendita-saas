-- AlterTable
-- Nullable para ser compatible con tokens creados antes de esta migración.
-- Los tokens antiguos deben regenerarse si se necesita volver a mostrarlos.
ALTER TABLE `api_tokens` ADD COLUMN `token_encrypted` TEXT NULL;
