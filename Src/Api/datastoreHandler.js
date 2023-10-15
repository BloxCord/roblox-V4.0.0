const { getDataKey, returnUniverses } = require('./database.js');

const axios = require('axios').default;
const crypto = require('crypto');

async function handleDatastoreAPI(entryKey, data, universeID) {
  if (!universeID) {
    // Retrieve all the universe IDs, and then loop through them and call this function again
    const universes = await returnUniverses();
    for (const universe of universes) {
      await handleDatastoreAPI(entryKey, data, universe.id);
    }
    return;
  }
  let datastoreApiKey = await getDataKey('datastoreApiKey');
  const JSONValue = JSON.stringify(data);
  const contentMD5 = crypto.createHash("md5").update(JSONValue).digest("base64");

  try {
    const response = await axios.post(`https://apis.roblox.com/datastores/v1/universes/${universeID}/standard-datastores/datastore/entries/entry`, JSONValue, {
      params: {
        "datastoreName": "DTRD",
        "entryKey": entryKey
      },
      headers: {
        "x-api-key": datastoreApiKey,
        "content-md5": contentMD5,
        "content-type": "application/json"
      }
    });

    return response.data;
  } catch (error) {
    throw new Error(`Error with datastore API | ${error.message}`);
  }
};

async function checkName(userToCheck, userOrID) {
  let baseURL = '';
  if (userOrID === 'username') {
    baseURL = `https://users.roblox.com/v1/usernames/users`;
  } else {
    baseURL = `https://api.roblox.com/users/${userToCheck}`;
  }
  let body = {
    "usernames": [userToCheck],
    "excludeBannedUsers": true
  }
  
  try {
    const response = await axios.post(baseURL, body);
    const returnedData = response.data.data[0];

    if (returnedData.id !== undefined) {
      return {id: returnedData.id, name: returnedData.name};
    } else {
      return false;
    }
  } catch (error) {
    throw new Error(`Error with name check API: ${error.message}`);
  }
};

async function getAvatarUrl (userId) {
  const robloxResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
  const avatarUrl = robloxResponse.data.data[0].imageUrl;

  return avatarUrl;
};

async function getGroupInfo (groupId) {
  const robloxResponse = await axios.get(`https://groups.roblox.com/v2/groups?groupIds=${groupId}`);
  const groupInfo = robloxResponse.data;

  return groupInfo;
}

async function handleMessageServiceAPI(message, topic, universeID) { // pass through the group ?
  let payload = {
      group: message, // i want to give the payload a different name, but what?
  }
  try {
    const response = await axios.post(`https://apis.roblox.com/messaging-service/v1/universes/${universeID}/topics/${topic}`,
    {
        "message": payload,
    },
    {
        headers: {
            'x-api-key': messageServiceApiKey,
            'Content-Type': 'application/json'
        }
    }
    ).catch(err => {
        if (err.response.status == 401) return interaction.reply(`**Error:** API key not valid for operation, user does not have authorization`)
        if (err.response.status == 403) return interaction.reply(`**Error:** Publish is not allowed on universe.`)
        if (err.response.status == 500) return interaction.reply(`**Error:** Server internal error / Unknown error.`)
        if (err.response.status == 400){
            if (err.response.data == "requestMessage cannot be longer than 1024 characters. (Parameter 'requestMessage')") return interaction.reply(`**Error:** The request message cannot be longer then 1024 characters long.`)
            console.log(err.response.data)
        }
    })
    if (response){
        if (response.status == 200) return interaction.reply(`Message sucessfully sent!`)
        if (response.status != 200) return interaction.reply(`**Error:** An unknown issue has occurred.`)
    }

    return response.status;
  } catch (error) {
    throw new Error(`Error with datastore API | ${error.message}`);
  }
}

module.exports = { checkName, getAvatarUrl, getGroupInfo, handleDatastoreAPI, handleMessageServiceAPI };