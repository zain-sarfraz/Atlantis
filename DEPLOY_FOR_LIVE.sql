-- ============================================================
-- Limiria / Atlantis — LIVE DB DEPLOY (single file)
-- ============================================================
-- HOW TO RUN (phpMyAdmin):
-- 1) Left sidebar se LIVE database SELECT karo
--    (tmp_limiria / jo bhi hosting DB hai)
-- 2) Top → SQL tab
-- 3) Yeh poori file paste / import karke Go
--
-- Agar "Duplicate column blockReason" aaye to ignore —
-- matlab column pehle se hai.
-- ============================================================

-- 1) availability.blockReason column
-- ------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN ('availability', 'Availability')
    AND COLUMN_NAME = 'blockReason'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `availability` ADD COLUMN `blockReason` VARCHAR(20) NULL AFTER `available`',
  'SELECT ''blockReason already exists'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Private Villa category (Limiria ke liye)
-- ------------------------------------------------------------
INSERT INTO `roomCategory` (
  `id`, `name`, `slug`, `displayOrder`, `description`, `isActive`, `createdAt`, `updatedAt`
) VALUES (
  'cat-private-villa',
  'Private Villa',
  'private-villa',
  0,
  'Entire Private Villa Reservation',
  1,
  NOW(3),
  NOW(3)
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `isActive` = 1,
  `updatedAt` = NOW(3);

-- 3) Limiria Villa → Lodgify mapping (fixes sync error 714507)
-- ------------------------------------------------------------
INSERT INTO `roomType` (
  `id`, `categoryId`, `name`, `slug`, `bedType`, `maxOccupancy`, `sizeSqm`, `viewType`,
  `description`, `mainImage`, `isActive`, `displayOrder`,
  `lodgifyPropertyId`, `lodgifyRoomTypeId`, `createdAt`, `updatedAt`
) VALUES (
  'cmt481dng000ysgh0ofqxz748',
  'cat-private-villa',
  'Limiria Villa Zanzibar',
  'limiria-villa-zanzibar',
  'KING',
  2,
  42,
  'PALM',
  'Overlook the iconic palm fronds from a refined private villa of calm neutrals and soft natural light - pool deck, open lounges, and the entire home reserved for your stay.',
  '/villa/villa-pool.png',
  1,
  0,
  714507,
  781617,
  NOW(3),
  NOW(3)
)
ON DUPLICATE KEY UPDATE
  `categoryId` = 'cat-private-villa',
  `name` = 'Limiria Villa Zanzibar',
  `isActive` = 1,
  `lodgifyPropertyId` = 714507,
  `lodgifyRoomTypeId` = 781617,
  `updatedAt` = NOW(3);

-- 4) Verify
-- ------------------------------------------------------------
SELECT id, name, lodgifyPropertyId, lodgifyRoomTypeId, isActive
FROM `roomType`
WHERE `lodgifyPropertyId` = 714507;

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('availability', 'Availability')
  AND COLUMN_NAME = 'blockReason';
