-- CreateTable
CREATE TABLE `guildsettings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `guild_id` BIGINT NOT NULL,

    UNIQUE INDEX `id`(`id`),
    UNIQUE INDEX `guildsettings_guild_id_key`(`guild_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Settings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `channel_for_notify` TEXT NULL,
    `guild_id` BIGINT NULL,
    `set_user_id` BIGINT NOT NULL,
    `guild_name` TEXT NOT NULL,

    UNIQUE INDEX `Settings_guild_id_key`(`guild_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `guildsettings` ADD CONSTRAINT `guildsettings_guild_id_fkey` FOREIGN KEY (`guild_id`) REFERENCES `Settings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

