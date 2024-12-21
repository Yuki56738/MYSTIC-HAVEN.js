import {PrismaClient} from "@prisma/client";

const dotenv = require('dotenv');
import {Client, IntentsBitField, SlashCommandBuilder, Interaction, Events} from 'discord.js';
import { logger } from './modules/logger'
dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const TEST_GUILD_ID = process.env.TEST_GUILD_ID;

const client = new Client({intents: IntentsBitField.Flags.Guilds});

let commands = [];
const comandPing= new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!');
const commandSetChannel = new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Sets the channel to log to.')
    .addStringOption(option => option.setName('channel').setDescription('The channel to log to with channel ID.').setRequired(true));
commands.push(comandPing.toJSON());
commands.push(commandSetChannel.toJSON());
client.on('ready', async e => {
    // console.log(`Logged in as ${client.user?.tag}!`);
    logger(`Logged in as: ${client.user?.tag}`, false)
    // await e.application?.commands.set(commands);
    await client.guilds.fetch(TEST_GUILD_ID!).then(async guild => {
        await guild.commands.set(commands);
    })
});

client.on(Events.InteractionCreate, async interaction => {
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
                const prisma = new PrismaClient()
                const allSetGuildId = await prisma.notifyvc.findMany()
                logger(`All set guilds: ${allSetGuildId}`, false)
                // allSetGuildId.forEach(async guild => {
                //     if (guild.guild_id !== interaction.guildId!.toString()){
                //         await prisma.notifyvc.upsert()
                //     }
                // })
                // await prisma.notifyvc.upsert({
                //     where: {},
                //     update:{},
                //     create: {guild_id: interaction.guildId!.toString(), set_channel: channel_id}
                // })
            }catch (e) {
                logger(`Error: ${e}`, true)
            }
            return
        }catch (e) {
            logger(`Error: ${e}`, true)
        }
    }
})

client.login(TOKEN);