import {PrismaClient} from "@prisma/client";
import {
    ChannelType,
    Client,
    Events,
    IntentsBitField,
    PermissionsBitField,
    SlashCommandBuilder,
    TextChannel,
    VoiceState
} from 'discord.js';
import * as dotenv from "dotenv";

import log4js from "log4js";

'use strict'
dotenv.config()
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

const prisma = new PrismaClient()

const TOKEN = process.env.BOT_TOKEN;
const TEST_GUILD_ID = process.env.TEST_GUILD_ID;

const client = new Client({
    intents: IntentsBitField.Flags.Guilds | IntentsBitField.Flags.GuildMessages | IntentsBitField.Flags.GuildMessages | IntentsBitField.Flags.GuildMessageTyping | IntentsBitField.Flags.GuildMessageReactions | IntentsBitField.Flags.MessageContent | IntentsBitField.Flags.GuildVoiceStates | IntentsBitField.Flags.GuildMembers | IntentsBitField.Flags.GuildModeration
});

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
const commandSetVC = new SlashCommandBuilder()
    .setName('setvc')
    .setDescription('ボイチャ作成用チャンネルの指定.')
    .addChannelOption(option => option.setName('voice_channel').setDescription('ボイチャ作成用チャンネル').setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice))
commands.push(commandPing.toJSON());
// commands.push(commandSetChannel.toJSON());
commands.push(commandGetChannel.toJSON());
commands.push(commandSetChannelWithGUI.toJSON());
commands.push(commandDebug.toJSON());
commands.push(commandSetVC.toJSON());


client.on('ready', async () => {
    logger.info(`Logged in as: ${client.user?.tag}`)
    logger.info(`Connecting to following guilds:`)
    client.guilds.cache.forEach((guild) => {
        logger.info(`- ${guild.name}`);
    })
    client.user?.setActivity('Created by Yuki.')
    if (process.env.TEST_GUILD_ID !== undefined) {
        logger.info('dev environment detected. Deploying commands to guild....')
        if (!TEST_GUILD_ID) {
            logger.error('Error: TEST_GUILD_ID is undefined.');
            return
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
    if (!interaction.isChatInputCommand()) return;

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
                await interaction.editReply('このサーバーに設定がありません。')
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
            const logChannel = interaction.options.getChannel('channel')
            const logChannelObj = await client.channels.fetch(logChannel!.id) as TextChannel
            logger.debug(`logChannelObj: ${logChannelObj.name} (${logChannelObj.id})`)
            await interaction.editReply(`logChannelObj: ${logChannelObj.name} (${logChannelObj.id})...`)
            if (logChannel?.type !== ChannelType.GuildText) {
                logger.error(`Error: Channel is not a text channel.`)
                await interaction.followUp(`エラー。ボイスチャンネルは指定できません！`)
                return
            }
            logger.debug(`Attempting to connect to database.`)
            const guild = await client.guilds.fetch(interaction.guildId!)

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
                        channel_for_notify: logChannelObj.id,
                        vc_for_create: '0'
                    }
                })
            } else {
                await prisma.settings.create({
                    data: {
                        guild_id: BigInt(interaction.guildId!),
                        guild_name: guild.name!,
                        set_user_id: BigInt(interaction.user.id!),
                        channel_for_notify: logChannelObj.id,
                        vc_for_create: '0'
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
    if (interaction.commandName === 'setvc') {
        logger.debug(`setvc command hit. by ${interaction.user.tag}: ${interaction.user.id}`)
        try {
            await interaction.deferReply()
            if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator, true)) {
                await interaction.editReply('権限拒否。')
                return
            }

            const vc = interaction.options.getChannel('voice_channel')
            if (vc === undefined || vc === null) {
                logger.error(`setvc comand: Error: Channel is null or undefined.`)
                await interaction.editReply('internal error. killing this command...')
                return
            }
            logger.debug(`vc: ${vc?.id}`)
            logger.debug(`setvc: vc: ${vc?.name}: ${vc?.id}`)
            // await interaction.editReply(`vc: ${vc?.toString()}`)
            await interaction.editReply(`VC作成用チャンネルを、VC '${vc.name}'に設定しています...`)

            const guild = await client.guilds.fetch(interaction.guildId!)
            logger.debug('Attaching database...')
            await prisma.settings.upsert({
                where: {guild_id: BigInt(interaction.guildId!)},
                update: {
                    guild_id: BigInt(interaction.guildId!),
                    guild_name: guild.name!,
                    set_user_id: BigInt(interaction.user.id!),
                    vc_for_create: vc.id,
                },
                create: {
                    guild_id: BigInt(interaction.guildId!),
                    guild_name: guild.name!,
                    set_user_id: BigInt(interaction.user.id!),
                    vc_for_create: vc.id,
                    channel_for_notify: '0',
                }
            })
            return
        } catch (e) {
            logger.error(
                `Error: ${e}`
            )
        }
        return
    }
})

client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
    // logger.debug(
    //     `VoiceStateUpdate event hit. oldstate: ${oldState.channel?.name} (${oldState.channel?.id}) ${oldState.member?.displayName} (${oldState.member?.nickname}) ${oldState.member?.id}, newstate: ${newState.channel?.name} (${newState.channel?.id}) ${newState.member?.displayName} (${newState.member?.displayName}) ${newState.member?.id}`
    // )
    logger.debug(`VoiceStateUpdate event hit.`)


    // const CREATE_VC = process.env.CREATE_VC || '1316107393343553719'

    await prisma.vCS.findMany({
        select: {vc_id: true, id: true},
        where: {vc_id: oldState.channelId ?? undefined}
    }).then(async (vcs) => {
        // vcs.filter(vcs => {if (vcs.vc_id === oldState.channelId){
        oldState.channel?.fetch(false).then(async (channel) => {
            for (const vcs1 of vcs) {
                if (channel.id === vcs1.vc_id) {
                    await channel!.delete('voice channel deleted by bot: temporary voice channel.').catch(e => {
                        logger.error(e)
                    })
                    logger.debug(`deleted vc: ${oldState.channelId}: ${oldState.channel?.name}`)

                }
                await prisma.vCS.delete({
                    where: {id: vcs1.id}
                }).catch(e => {
                    logger.error(e)
                })
                logger.debug(`deleted vc from db: ${vcs1.vc_id}`)
            }

        })

    })

    //get VC for create new VC
    const db_settings = await prisma.settings.findUnique({where: {guild_id: BigInt(newState.guild.id)}})
    const vcForCreate = db_settings?.vc_for_create ?? null;
    if (vcForCreate === null) {
        // logger.error(
        //     `Error: vcForCreate is null`)
        return
    }

    if (newState.channelId === vcForCreate) {
        try {
            // const member = newState.guild.members.cache.get(newState.member?.id!)
            const member = newState.member
            const createdChannel = await newState.guild?.channels.create({
                name: member?.displayName!, // Set the desired name, defaulting to 'Voice Channel'
                type: ChannelType.GuildVoice,
                parent: newState.channel?.parent,
            })
            const createdChannelId = client.channels.cache.get(createdChannel.id)!.id
            await newState.member?.fetch(false).then(async (member) => {
                await member.voice.setChannel(createdChannel)
            })
            logger.debug(`created vc: ${createdChannel.id}: ${createdChannel.name}`)

            await prisma.vCS.create({
                data: {
                    vc_id: createdChannelId!,
                    guild_id: createdChannel.guildId,
                    member_id: newState.member?.id!,
                    vc_name: createdChannel.name,
                }
            })
            logger.debug(`created vc in db: ${createdChannel.id}: ${createdChannel.name}`)

            await prisma.$disconnect()
        } catch (e) {
            logger.error(
                `Error: ${e}`
            )
        }
    }
})

client.login(TOKEN).catch(e => {
    logger.error(
        `Error: ${e}`
    )
})


