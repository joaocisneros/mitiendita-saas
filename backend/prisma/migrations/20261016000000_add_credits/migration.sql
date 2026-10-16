-- CreateTable
CREATE TABLE `credit_customers` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `document_number` VARCHAR(191) NULL,
    `address` TEXT NOT NULL,
    `reference` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `credit_limit` DECIMAL(10, 2) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_activity_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `credit_customers_company_id_idx`(`company_id`),
    UNIQUE INDEX `credit_customers_company_id_phone_key`(`company_id`, `phone`),
    UNIQUE INDEX `credit_customers_company_id_document_number_key`(`company_id`, `document_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_sales` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `credit_customer_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
    `total` DECIMAL(10, 2) NOT NULL,
    `paid_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `note` TEXT NULL,
    `sold_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` VARCHAR(191) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `cancel_reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `credit_sales_code_key`(`code`),
    INDEX `credit_sales_company_id_status_idx`(`company_id`, `status`),
    INDEX `credit_sales_credit_customer_id_idx`(`credit_customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_sale_items` (
    `id` VARCHAR(191) NOT NULL,
    `credit_sale_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `variant` VARCHAR(191) NULL,
    `sku` VARCHAR(191) NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `line_total` DECIMAL(10, 2) NOT NULL,

    INDEX `credit_sale_items_credit_sale_id_idx`(`credit_sale_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_payments` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `credit_customer_id` VARCHAR(191) NOT NULL,
    `credit_sale_id` VARCHAR(191) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `method` ENUM('cash', 'yape', 'plin', 'transfer') NOT NULL DEFAULT 'cash',
    `paid_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `note` VARCHAR(191) NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `credit_payments_company_id_paid_at_idx`(`company_id`, `paid_at`),
    INDEX `credit_payments_credit_customer_id_idx`(`credit_customer_id`),
    INDEX `credit_payments_credit_sale_id_idx`(`credit_sale_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `credit_customers` ADD CONSTRAINT `credit_customers_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_sales` ADD CONSTRAINT `credit_sales_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_sales` ADD CONSTRAINT `credit_sales_credit_customer_id_fkey` FOREIGN KEY (`credit_customer_id`) REFERENCES `credit_customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_sale_items` ADD CONSTRAINT `credit_sale_items_credit_sale_id_fkey` FOREIGN KEY (`credit_sale_id`) REFERENCES `credit_sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_sale_items` ADD CONSTRAINT `credit_sale_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_payments` ADD CONSTRAINT `credit_payments_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_payments` ADD CONSTRAINT `credit_payments_credit_customer_id_fkey` FOREIGN KEY (`credit_customer_id`) REFERENCES `credit_customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_payments` ADD CONSTRAINT `credit_payments_credit_sale_id_fkey` FOREIGN KEY (`credit_sale_id`) REFERENCES `credit_sales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
