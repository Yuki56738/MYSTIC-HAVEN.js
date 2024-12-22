-- CreateTable
CREATE TABLE `VCS` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vc_id` BIGINT NOT NULL,
    `member_id` TEXT NOT NULL,
    `guild_id` TEXT NOT NULL,

    UNIQUE INDEX `VCS_vc_id_key`(`vc_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VCSModel` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VCS` ADD CONSTRAINT `VCS_vc_id_fkey` FOREIGN KEY (`vc_id`) REFERENCES `VCSModel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
