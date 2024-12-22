import {PrismaClient} from "@prisma/client";
import {Client, IntentsBitField, SlashCommandBuilder, Events, TextChannel, Interaction} from 'discord.js';
import dotenv from "dotenv";
import {ChannelType} from 'discord.js';

'use strict'
const log4js = require('log4js');

dotenv.config();
log4js.configure({
    appenders: {
        console: {type: 'console'}, // コンソール出力
        file: {type: 'file', filename: 'logs/bot.log'}, // ファイル出力 (オプション)
    },
    categories: {
        default: {appenders: ['console', 'file'], level: 'info'}, // デフォルトカテゴリ
    },
});

// ロガーのインスタンス作成
const logger = log4js.getLogger();
logger.level = 'debug';

const TOKEN = process.env.BOT_TOKEN;
const TEST_GUILD_ID = process.env.TEST_GUILD_ID;

const client = new Client({intents: IntentsBitField.Flags.Guilds | IntentsBitField.Flags.GuildMessages | IntentsBitField.Flags.GuildMessages | IntentsBitField.Flags.GuildMessageTyping | IntentsBitField.Flags.GuildMessageReactions});

let commands = [];
const commandPing = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!');
// const commandSetChannel = new SlashCommandBuilder()
//     .setName('setchannel')
//     .setDescription('Sets the channel to log to.')
//     .addStringOption(option => option.setName('channel').setDescription('The channel to log to with channel ID.').setRequired(true));
const commandGetChannel = new SlashCommandBuilder()
    .setName('getchannel')
    .setDescription('Gets the channel to log to.');
const commandSetChannelWithGUI = new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('募集版を設定します。')
    .addChannelOption(option => option.setName('channel').setDescription('募集版').setRequired(true))
const commandDebug = new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Debugs the bot.')
commands.push(commandPing.toJSON());
// commands.push(commandSetChannel.toJSON());
commands.push(commandGetChannel.toJSON());
commands.push(commandSetChannelWithGUI.toJSON());
commands.push(commandDebug.toJSON());
client.on('ready', async () => {
    logger.info(`Logged in as: ${client.user?.tag}`)
    logger.info(`Connecting to following guilds:`)
    client.guilds.cache.forEach( (guild) => {
        logger.info(`- ${guild.name}`);
    })
    if (process.env.RAILWAY_ENVIRONMENT_NAME !== 'production') {
        logger.info('dev environment detected. Deploying commands to guild....')
        if (!TEST_GUILD_ID) {
            logger.error('Error: TEST_GUILD_ID is undefined.');
        }
        await client.guilds.fetch(TEST_GUILD_ID!).then(async guild => {
            await guild.commands.set(commands);
        })
    } else {
        logger.info('Production environment detected. Deploying commands to global....')
        await client.application?.commands.set(commands);
    }

});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'ping') {
        logger.debug(`Ping command hit.`)
        try {
            await interaction.reply('Pong!');
        } catch (e) {
            logger.error(`Error: ${e}`)
        }
        return
    }
    // if (interaction.commandName === 'setchannel') {
    //     logger.debug(`Set channel command hit.`)
    //     try {
    //         // @ts-ignore
    //         const channel_id: string = interaction.options.getString('channel');
    //         if (!channel_id) {
    //             logger.error('Error: Channel ID is null or undefined.');
    //             return;
    //         }
    //         logger.debug(`Channel ID retrieved: ${channel_id}`);
    //         try {
    //             logger.info(`Attempting to connect to database.`)
    //             const guild = await client.guilds.fetch(interaction.guildId!)
    //             const prisma = new PrismaClient()
    //             // const allSettings = await prisma.settings.findMany()
    //             // logger.debug(`All settings: ${allSettings}`)
    //             await prisma.settings.upsert({
    //                 where: {guild_id: BigInt(interaction.guildId!)},
    //                 update: {},
    //                 create: {
    //                     guild_id: BigInt(interaction.guildId!),
    //                     guild_name: guild.name!,
    //                     set_user_id: BigInt(interaction.user.id!),
    //                     channel_for_notify: channel_id!
    //                 }
    //             })
    //             await prisma.$disconnect()
    //         } catch (e) {
    //             logger.error(`Error: ${e}`)
    //         }
    //     } catch (e) {
    //         logger.error(`Error: ${e}`)
    //     }
    //     return
    //
    // }
    if (interaction.commandName === 'getchannel') {
        logger.debug(`Get channel command hit.`)
        try {
            await interaction.deferReply()
            // const guild = await client.guilds.fetch(interaction.guildId!)
            logger.info('Attempting to connect to database.')
            const prisma = new PrismaClient()
            // const allSettings = await prisma.settings.findMany()
            // logger(`All settings: ${allSettings}`)
            const allSettings = await prisma.settings.findMany({where: {guild_id: BigInt(interaction.guildId!)}})
            logger.debug(`All settings: ${allSettings.map(setting => setting.channel_for_notify).join(', ')}`)
            if (allSettings.length > 0) {
                await interaction.editReply(`Channel ID retrieved: ${allSettings[0].channel_for_notify}`)
            } else {
                await interaction.editReply(`No settings found for this guild.`)
                await prisma.$disconnect()
            }
        } catch (e) {
            logger.error(`Error: ${e}`)
        }
        return

    }
    if (interaction.commandName === 'setchannel') {
        logger.debug(`Set channel with GUI command hit.`)
        try {
            await interaction.deferReply()
            // @ts-ignore
            const logChannel: TextChannel = await interaction.options.getChannel('channel')
            logger.debug(`logChannel: ${logChannel}\nlogChannel type: ${logChannel.type}`)
            if (logChannel.type !== ChannelType.GuildText) {
                logger.error(`Error: Channel is not a text channel.`)
                await interaction.editReply(`エラー。ボイスチャンネルは指定できません！`)
                return
            }
            logger.debug(`Attempting to connect to database.`)
            const guild = await client.guilds.fetch(interaction.guildId!)
            const prisma = new PrismaClient()
            const allSettings = await prisma.settings.findMany()
            logger.debug(`All settings: ${allSettings}`)
            await prisma.settings.upsert({
                where: {guild_id: BigInt(interaction.guildId!)},
                update: {},
                create: {
                    guild_id: BigInt(interaction.guildId!),
                    guild_name: guild.name!,
                    set_user_id: BigInt(interaction.user.id!),
                    channel_for_notify: logChannel.id.toString()
                }
            })
            await prisma.$disconnect()
            await interaction.editReply(`募集版を ${logChannel.name} に設定しました。`)
        } catch (e) {
            logger.error(`Error: ${e}`)
        }
        return

    }
})

client.login(TOKEN);