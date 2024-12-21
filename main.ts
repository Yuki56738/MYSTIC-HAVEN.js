import {PrismaClient} from "@prisma/client";
import {Client, IntentsBitField, SlashCommandBuilder, Events, TextChannel} from 'discord.js';
import { logger } from './modules/logger'
import dotenv from "dotenv";

dotenv.config();

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
commands.push(commandPing.toJSON());
commands.push(commandSetChannel.toJSON());
commands.push(commandGetChannel.toJSON());
client.on('ready', async e => {
    // console.log(`Logged in as ${client.user?.tag}!`);
    logger(`Logged in as: ${client.user?.tag}`, false)
    // await e.application?.commands.set(commands);
    await client.guilds.fetch(TEST_GUILD_ID!).then(async guild => {
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
            const guild = await client.guilds.fetch(interaction.guildId!)
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
                    await interaction.editReply(`Channel ID retrieved: ${setting.channel_for_notify}`)
                    await client.channels.fetch(interaction.channelId).then(async (channel) => {
                        await (channel as TextChannel).send(`Channel name: ${(channel as TextChannel).name}`)
                    })
                    
                    break
                }
            }

            await prisma.$disconnect()
            return
        }catch (e) {
            logger(`Error: ${e}`, true)
        }
    }
})

client.login(TOKEN);