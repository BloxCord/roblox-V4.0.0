const { Collection, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js'); 
const { checkName, getAvatarUrl, handleDatastoreAPI } = require('../Api/datastoreHandler.js');
const { getDataKey, returnUniverses } = require('../Api/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamewarn')
        .setDescription('Warn a specified user from in game')
        .addStringOption(option =>
            option.setName('server')
                .setDescription('The name of the Server to ban the user from')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Warn user by Username or User ID')
                .setRequired(true)
                .addChoices(
                    { name: 'Username', value: 'username' },
                    { name: 'User ID', value: 'userid'},
                ))
        .addStringOption(option =>
            option.setName('userorid')
                .setDescription('Username/ID to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for warning')
                .setRequired(true))
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
        const serverID = interaction.options.getString('server');
        const userOrID = interaction.options.getString('category');
        const userToWarn = interaction.options.getString('userorid');
        const reason = interaction.options.getString('reason');

        try {
            const robloxData = await checkName(userToWarn, userOrID);

            if (robloxData.id) {
                const userId = robloxData.id;
                const avatarUrl = await getAvatarUrl(userId);

                const confirmEmbed = new EmbedBuilder()
                    .setColor('#eb4034')
                    .setTitle('Confirm Warn')
                    .setThumbnail(avatarUrl)
                    .setDescription(`Are you sure you want to warn **${userToWarn}**?\n\n**Reason:**\n${reason}`)
                    .setTimestamp();

                const message = await interaction.reply({ embeds: [confirmEmbed], fetchReply: true });

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

                            const method = "Warn";
                            const entryKey = `user_${robloxData.id}`;

                            const data = {
                                method: method,
                                reason: reason
                            };

                            try {
                                const response = await handleDatastoreAPI(entryKey, data, serverID);
                                const color = response.success ? '#00ff44' : '#eb4034';
                                const warnEmbed = new EmbedBuilder()
                                    .setColor(color)
                                    .setTitle(`${method} ${response ? 'Successful' : 'Failed'}`)
                                    .setThumbnail(avatarUrl)
                                    .setDescription(`**${userToWarn}** has been warned`)
                                    .setTimestamp();

                                const logEmbed = new EmbedBuilder()
                                    .setColor('#eb4034')
                                    .setTitle('Command Executed')
                                    .addFields({ name: 'Administrator', value: `${interaction.user}` })
                                    .addFields({ name: 'Action', value: `${method} ${userToWarn} ${reason}` })
                                    .setThumbnail(interaction.user.displayAvatarURL())
                                    .setTimestamp();

                                if (message) {
                                    message.edit({ embeds: [warnEmbed] });

                                if (logChan) {
                                    logChan.send({ embeds: [logEmbed] });
                                } else {
                                    console.log("Make sure to set a log channel!");
                                }
                                }
                                else {
                                    return console.error("No message detected");
                                }
                            }
                            catch (error) {
                                return console.error(error);
                            }
                            // TODO: Add warn to database
                        } else {
                            if (message.reactions.cache.size > 0) {
                                message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                            }

                            const updatedEmbed = {
                                title: 'Discord <-> Roblox System',
                                color: parseInt('00ff44', 16),
                                fields: [
                                    { name: 'Warn Cancelled', value: 'Cancelled the warn process'}
                                ]
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
                        }
                        else {
                            console.error(`Error awaiting reactions: ${error}`);
                            interaction.followUp('An error occurred while awaiting reactions.');
                        }
                    });
                } else {
                    await interaction.reply('Unable to find that user on Roblox.');
                }
            } catch (error) {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.reply('An error occurred while trying to fetch data from the Roblox API.');
            }
        }
    }
};