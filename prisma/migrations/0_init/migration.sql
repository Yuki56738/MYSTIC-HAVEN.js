-- CreateTable
CREATE TABLE `notifyvc` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `guild_id` TEXT NOT NULL,
    `set_channel` TEXT NOT NULL,

    UNIQUE INDEX `id`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

