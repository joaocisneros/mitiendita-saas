ALTER TABLE `company_settings`
  ADD COLUMN `search_visible` BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN `seo_title` VARCHAR(120) NULL,
  ADD COLUMN `seo_description` VARCHAR(320) NULL,
  ADD COLUMN `social_image_url` VARCHAR(500) NULL;
