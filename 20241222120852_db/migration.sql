/*
  Warnings:

  - You are about to drop the `VCSModel` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `VCS` DROP FOREIGN KEY `VCS_vc_id_fkey`;

-- DropIndex
DROP INDEX `VCS_vc_id_key` ON `VCS`;

-- AlterTable
ALTER TABLE `VCS` MODIFY `vc_id` TEXT NOT NULL;

-- DropTable
DROP TABLE `VCSModel`;
