-- AlterTable
ALTER TABLE `message` ADD COLUMN `attachment` LONGTEXT NULL,
    ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'text';
