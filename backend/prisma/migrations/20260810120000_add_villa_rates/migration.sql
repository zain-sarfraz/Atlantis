-- CreateTable
CREATE TABLE `VillaRate` (
    `id` VARCHAR(191) NOT NULL,
    `villaId` VARCHAR(191) NOT NULL,
    `rateType` ENUM('YEARLY', 'MONTHLY', 'SPECIFIC_DATE') NOT NULL,
    `month` INTEGER NULL,
    `date` DATE NULL,
    `basePrice` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VillaRate_villaId_rateType_idx`(`villaId`, `rateType`),
    INDEX `VillaRate_villaId_date_idx`(`villaId`, `date`),
    INDEX `VillaRate_villaId_month_idx`(`villaId`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VillaRate` ADD CONSTRAINT `VillaRate_villaId_fkey` FOREIGN KEY (`villaId`) REFERENCES `RoomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
