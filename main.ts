const dotenv = require('dotenv');
import {Client, IntentsBitField, SlashCommandBuilder} from 'discord.js';
import { logger } from './modules/logger'
dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const TEST_GUILD_ID = process.env.TEST_GUILD_ID;

const client = new Client({intents: IntentsBitField.Flags.Guilds});

let commands = [];
const comandPing= new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!');
commands.push(comandPing.toJSON());
client.on('ready', async e => {
    // console.log(`Logged in as ${client.user?.tag}!`);
    logger(`Logged in as: ${client.user.tag}`, false)
    await e.application?.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName === 'ping'){
        logger(`Ping command hit.q`, false)
        await interaction.reply('Pong!');
        return
    }
})

client.login(TOKEN);