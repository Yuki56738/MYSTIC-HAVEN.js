import {PrismaClient} from "@prisma/client";
import {
    Client,
    IntentsBitField,
    SlashCommandBuilder,
    Events,
    TextChannel,
    Interaction,
    PermissionOverwrites
} from 'discord.js';
import * as dotenv from "dotenv";
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

const client = new Client({intents: IntentsBitField.Flags.Guilds | IntentsBitField.Flags.GuildMessages | IntentsBitField.Flags.GuildMessages | IntentsBitField.Flags.GuildMessageTyping | IntentsBitField.Flags.GuildMessageReactions | IntentsBitField.Flags.MessageContent | IntentsBitField.Flags.GuildVoiceStates});

let commands = [];
const commandPing = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!');
const commandGetChannel = new SlashCommandBuilder()
    .setName('getchannel')
    .setDescription('募集版として設定されたチャンネルを確認する。');
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
    client.guilds.cache.forEach((guild) => {
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
        logger.debug(`Ping command hit. by ${interaction.user.tag}: ${interaction.user.id}`)
        try {
            await interaction.reply('Pong!');
        } catch (e) {
            logger.error(`Error: ${e}`)
        }
        return
    }
    if (interaction.commandName === 'getchannel') {
        logger.debug(`getchannel command hit. by ${interaction.user.tag}: ${interaction.user.id}`)
        try {
            await interaction.deferReply()
            logger.info('Attempting to connect to database.')
            const prisma = new PrismaClient()
            const guildId = BigInt(interaction.guildId!);
            const setting = await prisma.settings.findUnique({where: {guild_id: guildId}});

            if (setting) {
                const channelForNotify = setting.channel_for_notify;
                // @ts-ignore
                const channelForNotifyObj = await client.channels.fetch(channelForNotify) as TextChannel
                await interaction.editReply(`募集版は、 ${channelForNotifyObj.name} (${channelForNotifyObj.id}).`)
                logger.debug(`Channel for notify: ${channelForNotifyObj.name} (${channelForNotifyObj.id})`);
            } else {
                logger.debug(`No setting found for guild ID ${guildId}`);
            }
            await prisma.$disconnect()
        } catch (e) {
            logger.error(`Error: ${e}`)
        }
        return

    }
    if (interaction.commandName === 'setchannel') {
        logger.debug(`setchannel command hit. by ${interaction.user.tag}: ${interaction.user.id}`)
        try {
            await interaction.deferReply()
            // @ts-ignore
            const logChannel = await interaction.options.getChannel('channel')
            const logChannelObj = await client.channels.fetch(logChannel.id) as TextChannel
            logger.debug(`logChannelObj: ${logChannelObj.name} (${logChannelObj.id})`)
            await interaction.editReply(`logChannelObj: ${logChannelObj.name} (${logChannelObj.id})...`)
            if (logChannel.type !== ChannelType.GuildText) {
                logger.error(`Error: Channel is not a text channel.`)
                await interaction.followUp(`エラー。ボイスチャンネルは指定できません！`)
                return
            }
            logger.debug(`Attempting to connect to database.`)
            const guild = await client.guilds.fetch(interaction.guildId!)
            const prisma = new PrismaClient()
            const db_setting = await prisma.settings.findFirst({
                where: {guild_id: BigInt(interaction.guildId!)}
            })
            if (db_setting?.channel_for_notify) {
                await prisma.settings.update({
                    where: {guild_id: BigInt(interaction.guildId!)},
                    // update: {},
                    data: {
                        guild_id: BigInt(interaction.guildId!),
                        guild_name: guild.name!,
                        set_user_id: BigInt(interaction.user.id!),
                        channel_for_notify: logChannelObj.id
                    }
                })
            } else {
                await prisma.settings.create({
                    data: {
                        guild_id: BigInt(interaction.guildId!),
                        guild_name: guild.name!,
                        set_user_id: BigInt(interaction.user.id!),
                        channel_for_notify: logChannelObj.id
                    }
                })
            }
            await prisma.$disconnect()
            await interaction.followUp(`募集版を ${logChannel.name} (${logChannel.id}) に設定しました。`)
        } catch (e) {
            logger.error(`Error: ${e}`)
        }
        return

    }
})

client.login(TOKEN).catch(e => {
    logger.error(`Error: ${e}`)
})
