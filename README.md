# discord-fs

discord-fs is a Discord bot that allows creating an encrypted virtual file system accesible via FTP, backed by text-messages for journaling and attachments for storage. The maximum file size limit is 25mb. For bigger files i've implemented multi-part up & download. There is no limit in the amount of files in theory. 

## Features
* Theoretically unlimited file size thanks to splitting the file in 8mb chunks (discord is quite unreliable when it comes to uploading 20 files in a row without any issues)
* FTP frontend
* HTTP frontend (up & downloading) 
    I've disabled it for now because of building complications on windows. You may wanna tinker with it, to enable, uncomment the lines in GuildStorageHandler.ts
* (Incomplete) fuse frontend
* optional AES-256-CBC encryption (with per file iv, unreadable journal)

## Installation & Preparation

If you haven't already created a discord bot, follow the following steps:

### Create a Discord bot identity
1. Create a new application on https://discord.com/developers/applications
2. Select your new app, navigate to "Bot" in the sidebar, "Add Bot", copy its Token
3. Navigate to "OAuth2" in the sidebar, write down your "Client ID" 
4. Fill in http://localhost as Redirect above "Add Redirect" and save the form

### Invite the Discord bot to your guild
4. Complete the following url with your client id:
    https://discord.com/oauth2/authorize?response_type=code&client_id=YOUR_CLIENT_ID_HERE&scope=bot
5. Navigate to the url and let the bot join your preferred guild

You can obtain your guild and channel snowflake (its id) by enabling developer mode on your Discord client  (User Settings > Advanced > Developer Mode)
and rightclicking both the guilds name or the specifc channel and choose "Copy ID" from the context menu.

## Running

To run this fork you need to have a `config.ts` file in the root directory.

I've changed the config from how it was done in the original project to fit my needs.

```
export default {
    "CHANNEL": "",
    "GUILD": "",
    "LISTEN_IP": "127.0.0.1",
    "EXTERNAL_IP": "127.0.0.1",
    "HTTP_PORT" : "1338",
    "AES_KEY":"",
    "FTP_PORT": "1337",
    "TOKEN": ""
};

```

Note that you'll better not use it over internet due to the implementation missing TLS in all the frontends.

## License
[MIT](https://choosealicense.com/licenses/mit/)
