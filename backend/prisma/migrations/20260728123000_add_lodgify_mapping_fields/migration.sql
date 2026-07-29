-- AlterTable
ALTER TABLE `RoomType` ADD COLUMN `lodgifyPropertyId` INTEGER NULL,
    ADD COLUMN `lodgifyRoomTypeId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `lodgifyBookingId` VARCHAR(50) NULL,
    ADD COLUMN `lodgifySource` VARCHAR(100) NULL;

-- CreateIndex
CREATE INDEX `RoomType_lodgifyPropertyId_idx` ON `RoomType`(`lodgifyPropertyId`);

-- CreateIndex
CREATE INDEX `RoomType_lodgifyRoomTypeId_idx` ON `RoomType`(`lodgifyRoomTypeId`);

-- CreateIndex
CREATE UNIQUE INDEX `Booking_lodgifyBookingId_key` ON `Booking`(`lodgifyBookingId`);
