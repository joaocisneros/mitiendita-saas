/*
  Warnings:

  - You are about to drop the column `apellidos` on the `whatsapp_admin_contacts` table. All the data in the column will be lost.
  - You are about to drop the column `celular` on the `whatsapp_admin_contacts` table. All the data in the column will be lost.
  - You are about to drop the column `nombres` on the `whatsapp_admin_contacts` table. All the data in the column will be lost.
  - Added the required column `usuario` to the `whatsapp_admin_contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `whatsapp` to the `whatsapp_admin_contacts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `whatsapp_admin_contacts` DROP COLUMN `apellidos`,
    DROP COLUMN `celular`,
    DROP COLUMN `nombres`,
    ADD COLUMN `usuario` VARCHAR(191) NOT NULL,
    ADD COLUMN `whatsapp` VARCHAR(191) NOT NULL;
