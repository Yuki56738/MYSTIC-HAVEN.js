import {PrismaClient} from "@prisma/client";
import {Client, IntentsBitField, SlashCommandBuilder, Events, TextChannel} from 'discord.js';
// import { logger } from './modules/logger'
import dotenv from "dotenv";
import { ChannelType } from 'discord.js';
import log4js from 'log4js';
import {logger} from "./modules/logger";

dotenv.config();

// log4js.configure({
//     appenders: { out: { type: 'console' } }, //type = console??
//     file: {type: 'file', filename: 'application.log' },
//     categories: { default: { appenders: ['out'], level: 'info' } }
// })
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
    logger(`Logged in as: ${client.user?.tag}`, false)
    if (!TEST_GUILD_ID) {
        logger('Error: TEST_GUILD_ID is undefined.', true);
        return;
    }
    await client.guilds.fetch(TEST_GUILD_ID).then(async guild => {
        await guild.commands.set(commands);
    })
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'ping'){
        logger(`Ping command hit.`, false)
        try {
            await interaction.reply('Pong!');
        }catch (e) {
            logger(`Error: ${e}`, true)
        }
        return
    }
    if (interaction.commandName === 'setchannel'){
        logger(`Set channel command hit.`, false)
        try{
            // @ts-ignore
            const channel_id: string = interaction.options.getString('channel');
            if (!channel_id) {
                logger('Error: Channel ID is null or undefined.', true);
                return;
            }
            logger(`Channel ID retrieved: ${channel_id}`, false);
            try {
                logger(`Attempting to connect to database.`, false)
                const guild = await client.guilds.fetch(interaction.guildId!)
                const prisma = new PrismaClient()
               const allSettings =  await prisma.settings.findMany()
                logger(`All settings: ${allSettings}`, false)
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
                logger(`Error: ${e}`, true)
            }
            return
        }catch (e) {
            logger(`Error: ${e}`, true)
        }
    }
    if (interaction.commandName === 'getchannel'){
        logger(`Get channel command hit.`, false)
        try{
            await interaction.deferReply()
            // const guild = await client.guilds.fetch(interaction.guildId!)
            logger('Attempting to connect to database.', false)
            const prisma = new PrismaClient()
            // const allSettings = await prisma.settings.findMany()
            // logger(`All settings: ${allSettings}`, false)
            const allSettings = await prisma.settings.findMany()
            logger(`All settings: ${allSettings}`, false)
            for (const setting of allSettings) {
                if (setting.guild_id === BigInt(interaction.guildId!)){
                    logger(`Channel ID retrieved: ${setting.channel_for_notify}`, false)
                    logger(`setting: ${setting}`, false)
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
            logger(`Error: ${e}`, true)
        }
    }
    if (interaction.commandName === 'setchannelwithgui'){
        logger(`Set channel with GUI command hit.`, false)
        try{
            // @ts-ignore
            const logChannel: TextChannel = await interaction.options.getChannel('channel')
            logger(`logChannel: ${logChannel}\nlogChannel type: ${logChannel.type}`, false)
            if (logChannel.type !== ChannelType.GuildText){
                logger(`Error: Channel is not a text channel.`, true)

                return
            }
            logger(`Attempting to connect to database.`, false)
            const guild = await client.guilds.fetch(interaction.guildId!)
            const prisma = new PrismaClient()
            const allSettings =  await prisma.settings.findMany()
            logger(`All settings: ${allSettings}`, false)
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
            logger(`Error: ${e}`, true)
        }
    }
})

client.login(TOKEN);