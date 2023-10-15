const { REST, Routes } = require('discord.js');
const { clientId, guildId, botToken } = require('./Src/Credentials/Config.json');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
// Grab commands from the directory
const commandsPath = path.join(__dirname, 'Src', 'SlashCommands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const customToJSON = (obj) => {
    const seen = new WeakSet();
  
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return;
        }
        seen.add(value);
      }
      return value;
    });
  };
  

// Grab the SlashCommand output of each command
for (const file of commandFiles) {
    const command = require(`./Src/SlashCommands/${file}`);
    commands.push(JSON.parse(customToJSON(command.data)));
}

// Prepare the REST API
const rest = new REST({ version: '10' }).setToken(botToken);

// Deploy commands
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Fully refresh all commands
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();