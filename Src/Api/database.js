const { QuickDB } = require('quick.db');
const { EmbedBuilder } = require('discord.js');

let db;

const setupDatabase = async () => {
    db = new QuickDB();
    return db;
}

const getDb = async () => {
    if (!db) {
        db = await setupDatabase();
    }
    return db;
}

const saveSetting = async (settingName, settingValue) => {
    if (!db) {
        db = await setupDatabase();
    }
    const settings = await db.get('settings') || {};

    const existingSetting = Object.values(settings).find((setting) => setting.name === settingName);

    if (existingSetting) {
        existingSetting.id = settingValue;
        await db.set('settings', settings);

        const overwriteEmbed = new EmbedBuilder()
            .setTitle('Setting Overwritten')
            .setDescription(`Overwrote **${settingName}** in the database`)
            .setColor('#2f3136')
            .addFields(
                { name: 'Setting', value: settingName },
                { name: 'New Value', value: settingValue },
            )
            .setTimestamp();

        return overwriteEmbed;
    } else {
        settings[settingName] = { name: settingName, id: settingValue };
        await db.set('settings', settings);

        const universeEmbed = new EmbedBuilder()
            .setTitle('Setting Added')
            .setDescription(`Added **${settingName}** to the database`)
            .setColor('#2f3136')
            .addFields(
                { name: 'Setting', value: settingName },
                { name: 'Value', value: settingValue },
            )
            .setTimestamp();

        return universeEmbed;
    }
};

const getDataKey = async (key) => {
    if (!db) {
        db = await setupDatabase();
    }
    // Find the key and return the identifier
    const settings = await db.get('settings') || {};
    const dataKey = Object.values(settings).find((setting) => setting.name === key);
    return dataKey.id;
}

const addUniverse = async (db, universeName, universeID) => {
    if (!db) {
        db = await setupDatabase();
    }
    const universes = await db.get('universes') || {};

    if (Object.values(universes).find((universe) => universe.name === universeName)) {
        throw new Error(`Universe with name ${universeName} already exists`);
    }

    universes[universeID] = { name: universeName, id: universeID };
    await db.set('universes', universes);

    const universeEmbed = new EmbedBuilder()
        .setTitle('✔️ Universe Added')
        .setDescription(`Added **${universeName}** to the database`)
        .setColor('#5dca83')
        .addFields(
            { name: 'Name', value: universeName, inline: true },
            { name: 'ID', value: universeID, inline: true },
        )
        .setTimestamp();

    return universeEmbed;
}

const returnUniverses = async () => {
    if (!db) {
        db = await setupDatabase();
    }
  
    const universes = await db.get('universes') || {};
    return Object.values(universes).map((universe) => ({
        name: universe.name,
        id: universe.id
    }));
};

const listUniverses = async (db) => {
    const universes = await db.get('universes') || {};
    const universeList = Object.values(universes);

    if (universeList.length === 0) {
        const emptyEmbed = new EmbedBuilder()
            .setTitle('Universes')
            .setDescription('No universes found')
            .setColor('#5dca83')
            .setTimestamp();

        return emptyEmbed;
    }

    const universeEmbed = new EmbedBuilder()
        .setTitle('Universes')
        .setDescription('List of all universes')
        .setColor('#5dca83')
        .addFields(
            { name: 'Name', value: universeList.map((universe) => '➡ ' + universe.name).join('\n'), inline: true },
            { name: 'ID', value: universeList.map((universe) => universe.id).join('\n'), inline: true },
        )
        .setTimestamp();

    return universeEmbed;
}

const listSettings = async (db) => {
    const settings = await db.get('settings') || {};
    const settingList = Object.values(settings);
    // Check if the settings are empty
    if (settingList.length === 0) {
        const emptyEmbed = new EmbedBuilder()
            .setTitle('Settings')
            .setDescription('No settings found')
            .setColor('#2f3136')
            .setTimestamp();

        return emptyEmbed;
    }

    const universeEmbed = new EmbedBuilder()
        .setTitle('Settings')
        .setDescription('List of all settings')
        .setColor('#2f3136')
        .addFields(
            { name: 'Name', value: settingList.map((setting) => {
                if (typeof setting.name === 'string') {
                    return '✅' + setting.name;
                } else if (typeof setting.name === 'object' && setting.name.hasOwnProperty('value')) {
                    return '✅' + setting.name.value;
                }
                return '❌';
            }).join('\n'), inline: true },
            { name: 'ID', value: settingList.map((setting) => setting.id).join('\n'), inline: true },
        )
        .setTimestamp();

    return universeEmbed;
}


const removeUniverse = async (db, identifier) => {
    const universes = await db.get('universes') || {};

    const matchKey = Object.keys(universes).find(key => 
        universes[key].name.toLowerCase() === identifier.toLowerCase() || universes[key].id === identifier
    );

    if (!matchKey) {
        throw new Error(`Universe with name or id ${identifier} does not exist`);
    }

    const { name, id } = universes[matchKey];
    delete universes[matchKey];
    await db.set('universes', universes);

    const removedEmbed = new EmbedBuilder()
        .setTitle('✅ Universe Removed')
        .setDescription(`Universe: **${name}** with ID: **${id}** has been removed`)
        .setColor('#5dca83')
        .addFields(
            { name: 'Name', value: Object.values(universes).map((universe) => '🚀 ' + universe.name).join('\n'), inline: true },
            { name: 'ID', value: Object.values(universes).map((universe) => universe.id).join('\n'), inline: true },
        )

    return removedEmbed;
}

const removeSetting = async (db, identifier) => {
    const settings = await db.get('settings') || {};

    const matchKey = Object.keys(settings).find(key =>
        (typeof settings[key].name === 'string' && settings[key].name.toLowerCase() === identifier.toLowerCase()) ||
        (typeof settings[key].id === 'string' && settings[key].id === identifier)
    ); 

    if (!matchKey) {
        const emptyEmbed = new EmbedBuilder()
            .setTitle('❌ Settings')
            .setDescription(`Setting with Name/ID: **${identifier}** does not exist`)
            .setColor('#ad4242')
            .setTimestamp();

        return emptyEmbed;
    }

    const { name, id } = settings[matchKey];
    delete settings[matchKey];
    await db.set('settings', settings);

    const removedEmbed = new EmbedBuilder()
        .setTitle('✅ Setting Removed')
        .setDescription(`Setting: **${name}** with ID: **${id}** has been removed`)
        .setColor('#5dca83')
        .addFields(
            { name: 'Name', value: Object.values(settings).map((setting) => '🚀 ' + setting.name).join('\n'), inline: true },
            { name: 'ID', value: Object.values(settings).map((setting) => setting.id).join('\n'), inline: true },
        )

    return removedEmbed;
}

module.exports = { addUniverse, getDb, getDataKey, listSettings, listUniverses, removeSetting, removeUniverse, returnUniverses, saveSetting, setupDatabase };
