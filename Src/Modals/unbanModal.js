const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { saveSetting } = require('../Api/database.js');

module.exports = {
  name: 'unbanModal',
  async execute(interaction) {
    await interaction.deferReply();
    const logChan = interaction.options.getChannel('logchan');
    const appChan = interaction.options.getChannel('appchan');
    const modChan = interaction.options.getChannel('modalchan');

    let channelsSet = [];

    if (logChan) {
      await saveSetting('logChannelID', logChan.id);
      channelsSet.push(`Commands will be sent to: ${logChan}`);
    }

    if (appChan) {
      await saveSetting('appChannelID', appChan.id);
      channelsSet.push(`Application Responses will be sent to: ${appChan}`);
    }

    if (modChan) {
      channelsSet.push(`Appeal modal will appear on: ${modChan}`);

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('submitAppeal')
            .setLabel('✅ Unban Appeal')
            .setStyle(ButtonStyle.Secondary),
        );

      const embed = new EmbedBuilder()
        .setTitle('Unban Appeal')
        .setDescription('Please fill out the form below to appeal your ban')
        .setColor('#0099ff')
        .setTimestamp();

      const modChannel = interaction.guild.channels.cache.get(modChan.id);
      if (!modChannel) {
        interaction.followUp({ content: 'Channel not found', ephemeral: true });
      } else {
        try {
          const sentMessage = await modChannel.send({ embeds: [embed], components: [row] });
          interaction.followUp({ content: `Modal sent to ${modChan}`, ephemeral: true });
        } catch (err) {
          console.error(err);
          interaction.followUp({ content: 'Failed to send modal', ephemeral: true });
          return;
        }
      }
    }
  },
};