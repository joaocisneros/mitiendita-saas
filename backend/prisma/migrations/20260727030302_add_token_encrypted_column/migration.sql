/*
  Warnings:

  - Added the required column `token_encrypted` to the `api_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `api_tokens` ADD COLUMN `token_encrypted` TEXT NOT NULL;
