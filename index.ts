import Bot from "./src/DiscordFSBot";
import config from "./config";

let bot = new Bot();
bot.connect(config.TOKEN)
