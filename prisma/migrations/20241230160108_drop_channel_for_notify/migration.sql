/*
  Warnings:

  - You are about to drop the column `channel_for_notify` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the `guildsettings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `guildsettings` DROP FOREIGN KEY `guildsettings_guild_id_fkey`;

-- AlterTable
ALTER TABLE `Settings` DROP COLUMN `channel_for_notify`,
    ADD COLUMN `channel_for_wanted` TEXT NULL;

-- DropTable
DROP TABLE `guildsettings`;
