import * as Discord from "discord.js";
import Journal from "./backend/Journal";
import FTPFrontend from "./frontends/FTPFrontend";
//import FuseFrontend from "./frontends/FuseFrontend";
import HTTPFrontend from "./frontends/HTTPFrontend";
import IFrontend from "./frontends/IFrontend";
import config from "../config";

export default class StorageHandler{
   
    private journal: Journal
    private frontends : IFrontend[] = [];

    constructor(
        private guild: Discord.Guild, 
        private channel: Discord.TextChannel
    ){   
        this.journal = new Journal(channel);
    }

    public async load(){
        this.journal.load();
        this.loadFrontends();
    }

    private loadFrontends(){
        if(config.HTTP_PORT != null){
            let httpPort = config.HTTP_PORT;
            this.addFrontend(new HTTPFrontend(parseInt(httpPort)));
        }
        
        if(config.LISTEN_IP != null && (config.FTP_PORT != null) && config.EXTERNAL_IP != null){
            let port = config.FTP_PORT;
            let listenIP = config.LISTEN_IP;
            let externalIP = config.EXTERNAL_IP;
            this.addFrontend(new FTPFrontend(listenIP ,parseInt(port), externalIP));
        }

        this.startFrontends();
    }

    
    public addFrontend(frontend: IFrontend){
        this.frontends.push(frontend);
    }

    private startFrontends(){
        this.frontends.forEach(async f => await f.start(this.journal));
    }
}