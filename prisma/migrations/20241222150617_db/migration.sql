-- CreateTable
CREATE TABLE `VCS` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vc_id` TEXT NOT NULL,
    `member_id` TEXT NOT NULL,
    `guild_id` TEXT NOT NULL,
    `vc_name` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
