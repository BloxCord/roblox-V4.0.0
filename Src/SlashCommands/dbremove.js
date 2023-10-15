const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { removeUniverse, removeSetting, setupDatabase } = require('../Api/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dbremove')
        .setDescription('Remove a value from the database')
        .addStringOption(option =>
            option.setName('module')
                .setDescription('Select the module to setup')
                .setRequired(true) 
                .addChoices(
                    { name: 'Universe', value: 'uni' },
                    { name: 'Setting', value: 'setti' },
                ))
        .addStringOption(option =>
            option.setName('input')
                .setDescription('The name of the value to remove')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const module = interaction.options.getString('module');
        const uniInput = interaction.options.getString('input');
        if (!uniInput) {
            await interaction.reply('You must specify');
            return;
        }
        const db = await setupDatabase();
        let toRemove;
        if (module === 'uni') {
            toRemove = await removeUniverse(db, uniInput);
        } else if (module === 'setti'){
            toRemove = await removeSetting(db, uniInput);
        }

        await interaction.reply({
            embeds: [toRemove],
            ephemeral: true
        })
    }
};