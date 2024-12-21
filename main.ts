import {PrismaClient} from "@prisma/client";
import {Client, IntentsBitField, SlashCommandBuilder, Events, TextChannel} from 'discord.js';
import dotenv from "dotenv";
import { ChannelType } from 'discord.js';
'use strict'
const log4js = require('log4js');



dotenv.config();
log4js.configure({
    appenders: {
        console: { type: 'console' }, // コンソール出力
        file: { type: 'file', filename: 'logs/bot.log' }, // ファイル出力 (オプション)
    },
    categories: {
        default: { appenders: ['console', 'file'], level: 'info' }, // デフォルトカテゴリ
    },
});
// log4js.configure({
//     appenders: {
//         console: { type: 'console' }, // コンソール出力
//     },
//     categories: {
//         default: { appenders: ['console'], level: 'info' },
//     },
// });

// ロガーのインスタンス作成
const logger = log4js.getLogger();
logger.level = 'debug';

// log4js.configure({
//     appenders: { out: { type: 'console' } }, //type = console??
//     file: {type: 'file', filename: 'application.log' },
//     categories: { default: { appenders: ['out'], level: 'info' } }
// })
/*
log4js.configure({
    appenders: {
        console: { type: 'console' }, // コンソール出力
        file: { type: 'file', filename: 'logs/bot.log' }, // ファイル出力
    },
    categories: {
        default: { appenders: ['console', 'file'], level: 'info' }, // デフォルトカテゴリ
    },
});

const logger_log4js = log4js.getLogger()
*/

const TOKEN = process.env.BOT_TOKEN;
const TEST_GUILD_ID = process.env.TEST_GUILD_ID;

const client = new Client({intents: IntentsBitField.Flags.Guilds | IntentsBitField.Flags.GuildMessages | IntentsBitField.Flags.GuildMessages | IntentsBitField.Flags.GuildMessageTyping | IntentsBitField.Flags.GuildMessageReactions});

let commands = [];
const commandPing= new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!');
const commandSetChannel = new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Sets the channel to log to.')
    .addStringOption(option => option.setName('channel').setDescription('The channel to log to with channel ID.').setRequired(true));
const commandGetChannel = new SlashCommandBuilder()
    .setName('getchannel')
    .setDescription('Gets the channel to log to.');
const commandSetChannelWithGUI = new SlashCommandBuilder()
    .setName('setchannelwithgui')
    .setDescription('Sets the channel to log to with GUI.')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to log to.').setRequired(true))
const commandDebug = new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Debugs the bot.')
commands.push(commandPing.toJSON());
commands.push(commandSetChannel.toJSON());
commands.push(commandGetChannel.toJSON());
commands.push(commandSetChannelWithGUI.toJSON());
commands.push(commandDebug.toJSON());
client.on('ready', async () => {
    // console.log(`Logged in as ${client.user?.tag}!`);
    logger.info(`Logged in as: ${client.user?.tag}`)
    if (!TEST_GUILD_ID) {
        logger.error('Error: TEST_GUILD_ID is undefined.');
        return;
    }
    await client.guilds.fetch(TEST_GUILD_ID).then(async guild => {
        await guild.commands.set(commands);
    })
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'ping'){
        logger.debug(`Ping command hit.`)
        try {
            await interaction.reply('Pong!');
        }catch (e) {
            logger.error(`Error: ${e}`)
        }
        return
    }
    if (interaction.commandName === 'setchannel'){
        logger.debug(`Set channel command hit.`)
        try{
            // @ts-ignore
            const channel_id: string = interaction.options.getString('channel');
            if (!channel_id) {
                logger.error('Error: Channel ID is null or undefined.');
                return;
            }
            logger.debug(`Channel ID retrieved: ${channel_id}`);
            try {
                logger.info(`Attempting to connect to database.`)
                const guild = await client.guilds.fetch(interaction.guildId!)
                const prisma = new PrismaClient()
               const allSettings =  await prisma.settings.findMany()
                logger.debug(`All settings: ${allSettings}`)
                await prisma.settings.upsert({
                    where: {guild_id: BigInt(interaction.guildId!)},
                    update: {},
                    create: {guild_id: BigInt(interaction.guildId!),
                    guild_name: guild.name!,
                    set_user_id: BigInt(interaction.user.id!),
                    channel_for_notify: channel_id!}
                })
                await prisma.$disconnect()
                return
            }catch (e) {
                logger.error(`Error: ${e}`)
            }
            return
        }catch (e) {
            logger.error(`Error: ${e}`)
        }
    }
    if (interaction.commandName === 'getchannel'){
        logger.debug(`Get channel command hit.`)
        try{
            await interaction.deferReply()
            // const guild = await client.guilds.fetch(interaction.guildId!)
            logger.info('Attempting to connect to database.')
            const prisma = new PrismaClient()
            // const allSettings = await prisma.settings.findMany()
            // logger(`All settings: ${allSettings}`)
            const allSettings = await prisma.settings.findMany()
            logger.debug(`All settings: ${allSettings}`)
            for (const setting of allSettings) {
                if (setting.guild_id === BigInt(interaction.guildId!)){
                    logger.debug(`Channel ID retrieved: ${setting.channel_for_notify}`)
                    logger.debug(`setting: ${setting}`)
                    await interaction.followUp(`Channel ID retrieved: ${setting.channel_for_notify}`)
                    // await client.channels.fetch(interaction.channelId).then(async (channel) => {
                    //     await (channel as TextChannel).send(`Channel name: ${(channel as TextChannel).name}`)
                    // })
                    break
                }
            }

            await prisma.$disconnect()
            return
        }catch (e) {
            logger.error(`Error: ${e}`)
        }
    }
    if (interaction.commandName === 'setchannelwithgui'){
        logger.debug(`Set channel with GUI command hit.`)
        try{
            // @ts-ignore
            const logChannel: TextChannel = await interaction.options.getChannel('channel')
            logger.debug(`logChannel: ${logChannel}\nlogChannel type: ${logChannel.type}`)
            if (logChannel.type !== ChannelType.GuildText){
                logger.error(`Error: Channel is not a text channel.`)

                return
            }
            logger.debug(`Attempting to connect to database.`)
            const guild = await client.guilds.fetch(interaction.guildId!)
            const prisma = new PrismaClient()
            const allSettings =  await prisma.settings.findMany()
            logger.debug(`All settings: ${allSettings}`)
            await prisma.settings.upsert({
                where: {guild_id: BigInt(interaction.guildId!)},
                update: {},
                create: {guild_id: BigInt(interaction.guildId!),
                    guild_name: guild.name!,
                    set_user_id: BigInt(interaction.user.id!),
                    channel_for_notify: logChannel.id.toString()}
            })
            await prisma.$disconnect()
            return
        }catch (e) {
            logger.error(`Error: ${e}`)
        }
    }
})

client.login(TOKEN);