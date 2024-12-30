/*
  Warnings:

  - The primary key for the `VCS` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `vc_for_create` to the `Settings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Settings` ADD COLUMN `vc_for_create` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `VCS` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);
