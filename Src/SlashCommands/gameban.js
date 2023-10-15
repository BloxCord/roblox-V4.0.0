const { Collection, EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkName, getAvatarUrl, getGroupInfo, handleDatastoreAPI, handleMessageServiceAPI } = require('../Api/datastoreHandler.js');
const { getDataKey, returnUniverses } = require('../Api/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gameban')
        .setDescription('Ban a specified user from in game')
        .addStringOption(option =>
            option.setName('server')
                .setDescription('The name of the Server to ban the user from')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Kick user by Username or User ID')
                .setRequired(true)
                .addChoices(
                    { name: 'Username', value: 'username' },
                    { name: 'User ID', value: 'userid'},
                    { name: 'Group ID', value: 'groupid'}
                ))
        .addStringOption(option =>
            option.setName('input')
                .setDescription('Username/ID to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kicking')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('time')
                .setDescription('Time to ban the user for')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('length')
                .setDescription('Length of time to ban the user for')
                .setRequired(false) 
                .addChoices(
                    { name: 'Hour', value: 'hr' },
                    { name: 'Day', value: 'day' },
                    { name: 'Week', value: 'wk' },
                    { name: 'Month', value: 'mo' },
                    { name: 'Year', value: 'yr' },
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = await returnUniverses();
        
        const filtered = choices.filter((choice) => {
            if (typeof focusedValue === 'string') {
                return choice.name.toLowerCase().startsWith(focusedValue.toLowerCase());
            }
            return false;
        });
        await interaction.respond(filtered.map((choice) => ({ name: choice.name, value: choice.id })));
    },
    async execute(interaction) {
        const logID = await getDataKey('logChannelID');
        const logChan = await client.channels.fetch(logID);
        const userOrID = interaction.options.getString('category');
        const userToBan = interaction.options.getString('input');
        const reason = interaction.options.getString('reason');
        const timeToBan = interaction.options.getInteger('time');
        const lengthToBan = interaction.options.getString('length');
        const universeID = interaction.options.getString('server'); 
        let combinedTime = timeToBan && lengthToBan ? timeToBan + lengthToBan : 'Permanent';
        if (!universeID) {
            const embed = new EmbedBuilder()
                .setColor('#ec7168')
                .setTitle('🚫 Error')
                .setDescription('Please specify a server to ban the user from')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
        if (!userToBan) {
            const embed = new EmbedBuilder()
                .setColor('#ec7168')
                .setTitle('🚫 Error')
                .setDescription('Please specify a user and reason to ban.\n\nYou selected **Server ID: **' + `${universeID}`)
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
        try {
            if (userOrID === 'groupid') {
                console.log("GROUP ID " + userToBan)
                const groupData = await getGroupInfo(userToBan);

                if (groupData) {
                    let groupID = userToBan;
                    const groupName = groupData['data'][0]['name'];
                    
                    const confirmEmbed = new EmbedBuilder()
                        .setColor('#2f3136')
                        .setTitle('⚠️ Confirm Group Ban ⚠️')
                        .setDescription(`Are you sure you want to ban the Group: **${groupName} **?\n\nReason:\n**${reason}**`)
                        .setTimestamp()

                    const message = await interaction.reply ({ embeds: [confirmEmbed], fetchReply: true });

                    await message.react('✔️');
                    await message.react('❌');

                    const filter = (reaction, user) => {
                        return ['✔️', '❌'].includes(reaction.emoji.name) && user.id === interaction.user.id;
                    };

                    message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                        .then(async collected => {
                            const reaction = collected.first();

                            if (reaction.emoji.name === '✔️') {
                                if (message.reactions.cache.size > 0) {
                                    message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                }

                                try {
                                    const data = await handleMessageServiceAPI(userToBan, 'DTR', universeID);
                                    const color = data.status == 200 ? '#76da90' : '#ec7168';

                                    const embed = new EmbedBuilder()
                                        .setColor(color)
                                        .setTitle('🚫 Group Banned')
                                        .setDescription(`**${groupName}** has been banned from **${universeID}**\n\nReason:\n**${reason}**`)
                                        .setTimestamp()

                                    const logEmbed = new EmbedBuilder()
                                        .setColor('#76da90')
                                        .setTitle('🚫 Group Banned')
                                        .setDescription(`**${groupName}** has been banned from **${universeID}**\n\nReason:\n**${reason}**`)
                                        .setTimestamp()

                                    if (message) {
                                        message.edit({ embeds : [embed] })
                                        if (logChan) {
                                            logChan.send({ embeds: [logEmbed] });
                                        } else {
                                            console.log('Make sure to set a log channel!');
                                        }
                                    } else {
                                        return console.error('No message found!');
                                    }
                                } catch (error) {
                                    return console.error('Failed to ban group: ', error);
                                }
                            } else {
                                if (message.reactions.cache.size > 0) {
                                    message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                }
                                const newEmbed = {
                                    title: '🚫 Group Ban Cancelled',
                                    color: parseInt('00ff44', 16),
                                    fields: [
                                        { name: 'Group Ban Cancelled', value: `**${groupName} **has not been banned from **${universeID}**` }
                                    ]
                                };
                                await message.edit({ embeds: [newEmbed] });
                            }
                        })
                        .catch(error => {
                            if (error instanceof Collection) {
                                if (message.reactions.cache.size > 0) {
                                    message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                }
                                const timeout = {
                                    title: '🚫 Group Ban Cancelled',
                                    color: parseInt('00ff44', 16),
                                    fields: [
                                        { name: 'Group Ban Cancelled', value: `**${groupName} **has not been banned from **${universeID}**` }
                                    ]
                                };
                                message.edit({ embeds: [timeout] });
                            } else {
                                console.error(`Error awaiting reactions: ${error}`);
                                interaction.followUp({ content: `Error awaiting reactions: ${error}` })
                            }
                        });
                } else {
                    const prettyEmbed = new EmbedBuilder()
                        .setColor('#ec7168')
                        .setTitle('🚫 Error')
                        .setDescription(`Failed to find group with ID: ${userToBan}`)
                        .setTimestamp()

                    await interaction.reply({
                        embeds: [prettyEmbed],
                        ephemeral: true
                    })
                }
                return;
            }
            const robloxData = await checkName(userToBan, userOrID);

            if (robloxData.id) {
                const userId = robloxData.id;
                const avatarUrl = await getAvatarUrl(userId);

                const confirmEmbed = new EmbedBuilder()
                    .setColor('#2f3136')
                    .setTitle('Confirm Game Ban')
                    .setThumbnail(avatarUrl)
                    .setDescription(`Are you sure you want to ban **${userToBan}**?\n\nTime:\n**${combinedTime}**\n\nReason:\n**${reason}**`)
                    .setTimestamp()

                const message = await interaction.reply ({ embeds: [confirmEmbed], fetchReply: true });

                await message.react('👍');
                await message.react('👎');

                const filter = (reaction, user) => {
                    return ['👍', '👎'].includes(reaction.emoji.name) && user.id === interaction.user.id;
                };

                message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                    .then(async collected => {
                        const reaction = collected.first();

                        if (reaction.emoji.name === '👍') {
                            if (message.reactions.cache.size > 0) {
                                message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                            }

                            const method = "Ban";
                            const entryKey = `user_${robloxData.id}`;
                            const data = { method: method, time: combinedTime, reason: reason }

                            try {
                                const response = await handleDatastoreAPI(entryKey, data, universeID);
                                const color = response.success ? '#00ff44' : '#eb4034';
                        
                                const embed = new EmbedBuilder()
                                    .setColor(color)
                                    .setTitle(`${method} ${response ? 'Successful' : 'Failed'}`)
                                    .setThumbnail(avatarUrl)
                                    .addFields({ name: 'Username', value: `${robloxData.name}` })
                                    .addFields({ name: 'User ID', value: `${robloxData.id}` })
                                    .setTimestamp();

                                const logEmbed = new EmbedBuilder()
                                    .setColor('#eb4034')
                                    .setTitle('Command Executed')
                                    .addFields({ name: 'Administrator', value: `${interaction.user}` })
                                    .addFields({ name: 'Action', value: `${method} ${userToBan} **${reason}** **${combinedTime}**` })
                                    .setThumbnail(interaction.user.displayAvatarURL())
                                    .setTimestamp();

                                if (message) {
                                    message.edit({ embeds: [embed] });
                                    if (logChan) {
                                        logChan.send({ embeds: [logEmbed] });
                                    } else {
                                        console.log("Make sure to set a log channel!");
                                    }
                                } else {
                                    return console.error(`Datastore API | ${error}`);
                                }
                            } catch (error) {
                                return console.error(`Datastore API | ${error}`);
                            }
                        } else {
                            if (message.reactions.cache.size > 0) {
                                message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                            }
                            const updatedEmbed = {
                                title: 'Discord <-> Roblox System',
                                color: parseInt('00ff44', 16),
                                fields: [{ name: 'Ban Cancelled', value: 'Cancelled the ban process' }]
                            };
                            await message.edit({ embeds: [updatedEmbed] });
                        }
                    })
                    .catch(error => {
                        if (error instanceof Collection) {
                            if (message.reactions.cache.size > 0) {
                                message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                            }
                            const timeoutEmbed = {
                                title: 'Discord <-> Roblox System',
                                color: parseInt('00ff44', 16),
                                fields: [
                                    { name: 'Timeout', value: 'Timed out'}
                                ]
                            };
                            message.edit({ embeds: [timeoutEmbed] });
                        } else {
                            console.error(`Error awaiting reactions: ${error}`);
                            interaction.followUp('An error occurred while awaiting reactions.');
                        }
                    });
            } else {
                await interaction.reply('Unable to find that user on Roblox.');
            } 
            }   catch (error) {
            console.log("ERR | ", error);
            if (!interaction.deferred && !interaction.replied) {
                await interaction.reply({ content: `An error occurred while trying to ban that user.\n\n**Error:**\n${error.data}` });
            }
        }
    }
};