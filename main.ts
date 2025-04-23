import {PrismaClient} from "@prisma/client";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Client,
    Collection,
    Events,
    IntentsBitField,
    Message,
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
        console: {type: 'console'},
        file: {type: 'file', filename: 'logs/bot.log'},
    },
    categories: {
        default: {appenders: ['console', 'file'], level: 'info'},
    },
});

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
const commandDebug = new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Debugs the bot.')
const commandSetVC = new SlashCommandBuilder()
    .setName('setvc')
    .setDescription('ボイチャ作成用チャンネルの指定.')
    .addChannelOption(option => option.setName('voice_channel').setDescription('ボイチャ作成用チャンネル').setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice))
const commandDelmsgsbyuserid = new SlashCommandBuilder()
    .setName('delmsgbyuserid')
    .setDescription('指定されたIDを持つユーザーの投稿をすべて削除する。')
    .addStringOption(option =>
        option.setName('userid')
            .setDescription('対象のユーザーのID')
            .setRequired(true))

commands.push(commandPing.toJSON());
commands.push(commandDebug.toJSON());
commands.push(commandSetVC.toJSON());
commands.push(commandDelmsgsbyuserid.toJSON());

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
        // await client.guilds.fetch("965354369556049990").then(async guild => {
        //     await guild.commands.set(commands);
        //     if (guild.id === "965354369556049990") {
        //         const userOfThisBot = await guild.members.fetch(client.user?.id!)
        //         const permsThisBot2 = userOfThisBot.permissions
        //         logger.info(`perms: ${permsThisBot2.toArray().toString()}`)
        //     }
        // })
    }
});


client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.user.bot) return;
    logger.debug(
        `InteractionCreate event hit. by ${interaction.user.tag}: ${interaction.user.id}`
    )
    if (interaction.commandName === 'delmsgbyuserid') {
        await interaction.deferReply()
        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply('権限拒否.')
            logger.info(`*****${interaction.user.globalName} hit /delmsgbyuserid command but has no permission.******`)
            return
        }
        const option_userid = interaction.options.getString('userid')
        console.log(option_userid)
        const user1 = await interaction.guild?.members.fetch(option_userid!).catch(() => null);
        if (user1 === undefined || user1 === null) {
            await interaction.followUp('指定されたユーザーが見つかりません。');
            return;
        }

        console.log(user1)

        const yesButton = new ButtonBuilder()
            .setCustomId('confirm_delete')
            .setLabel('YES')
            .setStyle(ButtonStyle.Danger);

        const noButton = new ButtonBuilder()
            .setCustomId('cancel_delete')
            .setLabel('NO')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(yesButton, noButton);

        const res = await interaction.followUp({
            content: `本当に、${user1?.displayName} (${user1?.nickname}) の全ての投稿を削除しますか？`,
            components: [row],
        });
        const comfirmation = await res.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 60_000
        })
        if (comfirmation.customId === 'confirm_delete') {
            logger.info(`${interaction.user.globalName} hit delete button.\n***Deleting ${user1.displayName} (${user1.id})'s messages.***`)
            await interaction.followUp('削除しています...')

            if (user1 === undefined || user1 === null) {
                await interaction.followUp('指定されたユーザーが見つかりません。');
                return;
            }

            try {
                const guild = interaction.guild;
                if (!guild) {
                    await interaction.followUp('ギルド情報が取得できません。');
                    return;
                }

                await interaction.followUp('メッセージを削除しています…。この処理には時間がかかる場合があります。');

                const channels = guild.channels.cache.filter(channel => channel.type === ChannelType.GuildText) as Map<string, TextChannel>;

                for (const [, channel] of channels) {
                    logger.info(`Fetching messages from channel ${channel.name} (${channel.id})`);

                    let lastMessageId: string | undefined = undefined;

                    while (true) {
                        const messages_to_del = await channel.messages.fetch({
                            limit: 100,
                            ...(lastMessageId && {before: lastMessageId}),
                        }) as Collection<string, Message>;

                        if (messages_to_del.size === 0) break;

                        const userMessages = messages_to_del.filter(msg => msg.author.id === user1.id);

                        for (const [, msg] of userMessages) {
                            await msg.delete().catch(async e => {
                                logger.error(`Failed to delete message: ${e}`);
                            });
                        }

                        lastMessageId = messages_to_del.last()?.id;

                        if (messages_to_del.size < 100) break;
                    }
                }

                await interaction.followUp(`${user1.displayName ?? user1.nickname ?? user1.user.username} のメッセージを削除しました。`);
            } catch (error) {
                logger.error(`Error during message deletion: ${error}`);
                await interaction.followUp('エラーが発生しました。メッセージを削除できませんでした。');
            }
        }

    }
    if (interaction.commandName === 'ping') {
        logger.debug(`Ping command hit. by ${interaction.user.tag}: ${interaction.user.id}`)
        try {
            await interaction.reply('Pong!');
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
                    channel_for_wanted: '0',
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
    logger.debug(`VoiceStateUpdate event hit.`)


    const oldstate_channel = oldState.channel
    if (oldstate_channel?.members.size! >= Number(1)) {
        return
    }
    await prisma.vCS.findMany({
        select: {vc_id: true, id: true},
        where: {vc_id: oldstate_channel?.id ?? undefined}
    }).then(async (vcs) => {
        oldstate_channel?.fetch(false).then(async (channel) => {
            for (const vcs1 of vcs) {
                if (channel.id === vcs1.vc_id) {
                    try {
                        await channel!.delete('voice channel deleted by bot: temporary voice channel.')
                        logger.debug(`deleted vc: ${oldState.channelId}: ${oldState.channel?.name}`)
                    } catch (e) {
                        logger.error(e)
                    }
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

    const db_settings = await prisma.settings.findUnique({where: {guild_id: BigInt(newState.guild.id)}})
    const vcForCreate = db_settings?.vc_for_create ?? null;
    if (vcForCreate === null) {
        logger.error(
            `Error: vcForCreate is null`)
        return
    }

    if (newState.channelId === vcForCreate) {
        try {
            const member = newState.member
            const createdChannel = await newState.guild?.channels.create({
                name: member?.displayName!, type: ChannelType.GuildVoice,
                parent: newState.channel?.parent,
            })
            const createdChannelId = createdChannel.id
            await member?.fetch(false).then(async (member) => {
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


