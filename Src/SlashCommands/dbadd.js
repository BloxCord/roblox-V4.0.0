const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addUniverse, getDb } = require('../Api/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dbadd')
        .setDescription('Add a universe to the database')
        .addStringOption(option =>
            option.setName('universe')
                .setDescription('The name of the universe')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('id')
                .setDescription('The id of the universe')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const universeName = interaction.options.getString('universe');
        const universeID = interaction.options.getString('id');
        if (!universeName || !universeID) {
            await interaction.reply('You must specify both to true to add a universe');
            return;
        }
        // list all the databases
        const db = await getDb();
        const toAdd = await addUniverse(db, universeName, universeID);
        await interaction.reply({
            embeds: [toAdd],
        });
    }
};