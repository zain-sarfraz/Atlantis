-- CreateTable
CREATE TABLE `LodgifyBooking` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(50) NULL,
    `propertyId` INTEGER NULL,
    `roomId` INTEGER NULL,
    `guestName` VARCHAR(255) NULL,
    `guestEmail` VARCHAR(255) NULL,
    `arrival` DATE NULL,
    `departure` DATE NULL,
    `status` VARCHAR(50) NULL,
    `action` VARCHAR(80) NULL,
    `source` VARCHAR(100) NULL,
    `rawPayload` JSON NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LodgifyBooking_bookingId_idx`(`bookingId`),
    INDEX `LodgifyBooking_propertyId_idx`(`propertyId`),
    INDEX `LodgifyBooking_status_idx`(`status`),
    INDEX `LodgifyBooking_receivedAt_idx`(`receivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
