const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSetting } = require('../Api/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dbsetup')
        .setDescription('Setup the database for the bot')
        .addStringOption(option =>
            option.setName('module')
                .setDescription('Select the module to setup')
                .setRequired(true) 
                .addChoices(
                    { name: 'DataStore', value: 'db' },
                    { name: 'logChannelID', value: 'logchan' },
                ))
        .addStringOption(option =>
            option.setName('dbkey')
                .setDescription('The value to save')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const module = interaction.options.getString('module');
        const dbkey = interaction.options.getString('dbkey');
        
        if (!module || !dbkey) {
            await interaction.reply('You must specify both values to setup the database');
            return;
        }

        let settingEmbed;
        if (module === 'db') {
            settingEmbed = await saveSetting('datastoreApiKey', dbkey);
        } else if (module === 'logchan'){
            settingEmbed = await saveSetting('logChannelID', dbkey);
        } else {
            return console.log('Error: No module selected');
        }

        await interaction.reply({
            embeds: [settingEmbed],
            ephemeral: true
        });
    }
};