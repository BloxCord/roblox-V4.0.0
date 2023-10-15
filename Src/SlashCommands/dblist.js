const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb, listSettings, listUniverses } = require('../Api/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dblist')
        .setDescription('List all the values in the database')
        .addStringOption(option =>
            option.setName('module')
                .setDescription('Select the module to list')
                .setRequired(true) 
                .addChoices(
                    { name: 'Universe', value: 'uni' },
                    { name: 'Settings', value: 'setti' },
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const module = interaction.options.getString('module');
        // list all the databases
        const db = await getDb();

        let universes;
        if (module === 'uni') {
            universes = await listUniverses(db);
        } else if (module === 'setti') {
            universes = await listSettings(db);
        }

        await interaction.reply({
            embeds: [universes],
            ephemeral: true
        });
    }
};