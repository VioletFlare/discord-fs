import * as crypto from "crypto";
import * as Discord from "discord.js";
import * as https from "https";
import * as MultiStream from "multistream";
import * as path from "path";
import * as stream from "stream";
import { v4 as uuidv4 } from 'uuid';

import IJournal from "./IJournal";
import FileStream from "./utils/FileStream";
import SizeStream from "./utils/SizeStream";
import ThumbnailGenerator from "./utils/ThumbnailGenerator";
import { DirectoryJournalEntry } from "./DirectoryJournalEntry";
import { FileJournalEntry } from "./FileJournalEntry";
import { JournalFile } from "./JournalFile";
import { JOURNAL_ENTRY_TYPE } from "./BaseJournalEntry";

const fs = require('fs');

import config from "../../config";

// tslint:disable-next-line
const StreamSkip = require('stream-skip');

export default class Journal implements IJournal {
    private aesKey = config.AES_KEY ? crypto.createHash('md5').update(config.AES_KEY,"utf8").digest("hex").slice(0, 32) : null;

    encrypt(text:string) : string {
        let iv = crypto.randomBytes(16);
        let cipher = crypto.createCipheriv("aes-256-cbc",this.aesKey,iv);
        return iv.toString("hex") + cipher.update(Buffer.from(text,"utf-8"),null,"hex") + cipher.final("hex");
      }
       
    decrypt(text:string) : string{
        let b = Buffer.from(text, "hex");
        let iv = b.slice(0,16);
        let data = b.slice(16,b.length);
        let decipher = crypto.createDecipheriv("aes-256-cbc",this.aesKey,iv);
        return decipher.update(data).toString() + decipher.final().toString();
    }

    constructor(channel: Discord.TextChannel) {
        this.channel = channel;
    }

    getCipher(iv: Buffer){
        return crypto.createCipheriv("aes-256-cbc",this.aesKey,iv);
    }

    getDecipher(iv : Buffer){
        return crypto.createDecipheriv("aes-256-cbc",this.aesKey,iv);
    }

    private channel: Discord.TextChannel;

    public async load() {
        let that: Journal = this;
        let lastMessages = await this.channel.messages.fetch({ limit: 100 });
        let messages : Array<Discord.Message> = Array.from(lastMessages.values());
        console.info("Fetched "+messages.length +" journal entries");

        while(lastMessages.size === 100)
        {
            lastMessages = await this.channel.messages.fetch({ limit: 100, before:lastMessages.lastKey() });
            messages = messages.concat(Array.from(lastMessages.values()));
            console.info("Fetched "+lastMessages.size +" more journal entries");
        }

        messages.filter(m => m.author.id == that.channel.client.user.id).forEach(message => {
            try {
                let entry = null;

                if(that.aesKey != null){
                    let content = that.decrypt(message.content);
                    entry = JSON.parse(content);
                }else{
                    entry = JSON.parse(message.content);
                }

                if (entry.type == JOURNAL_ENTRY_TYPE.DIRECTORY) {
                    let directory :DirectoryJournalEntry = <DirectoryJournalEntry>Object.assign(new DirectoryJournalEntry(), entry)
                    directory.mid = message.id;
                    directory.changed = message.createdAt;
                    that.directories.push(directory);
                }
                if (entry.type == JOURNAL_ENTRY_TYPE.FILE) {
                    let attachment = message.attachments.first();
                    let file :FileJournalEntry = <FileJournalEntry>Object.assign(new FileJournalEntry(), entry)
                    file.size = attachment.size;
                    file.url = attachment.url;
                    file.mid = message.id;
                    file.changed = message.createdAt;
                    that.files.push(file);
                }
            }
            catch (e) {
                console.error("Couldn't parse journal entry: " + message.content);
            }
        });
        
        if((await that.getDirectory("/")) == null) that.createDirectory("/");
              
    }

    private directories: Array<DirectoryJournalEntry> = new Array<DirectoryJournalEntry>();
    private files: Array<FileJournalEntry> = new Array<FileJournalEntry>();

    private normalizePath(p: string){
        let r = path.posix.normalize(p.replace(/\\/g, '/'));
        if(r.endsWith("/") && r != "/") r = r.slice(0, -1);
        return r;
    }

    
    public async download(file: JournalFile, offset: number) : Promise<stream.Readable> {
        let that = this;
        let files = [file.journalEntry].concat(file.parts);
        let streams = [];
        for(let f of files){
            let res = await that.downloadFile(f.url);
            
            if(that.aesKey == null){
                res.pause();
                streams.push(res);
            }else{
                res.pause();
                streams.push(res.pipe(that.getDecipher(Buffer.from(f.iv,"hex"))));
            }
        }

        if (offset) {
            const offsetRemainder = offset % 25e6;
            const streamsOffset = (offset - offsetRemainder) / 25e6;
            streams = streams.slice(streamsOffset);

            if (offsetRemainder) {
                var sstream = new StreamSkip({ skip: offsetRemainder })
                streams[0] = streams[0].pipe(sstream);
            }
        }

        return new MultiStream(streams);
    }
    

    private async downloadFile(url: string) : Promise<stream.Readable> {
        return new Promise<stream.Readable>((resolve, reject) => { https.get(url, resolve).on("error", reject); });
    }

    public async getDirectory(directoryName: string) : Promise<DirectoryJournalEntry>{
        directoryName = this.normalizePath(directoryName);
        let directory = this.directories.find(d => d.name == directoryName);
        return directory;
    }


    public async getChildDirectories(directoryName: string) : Promise<Array<string>> {
        directoryName = this.normalizePath(directoryName);
        let children :string[] = [];
        this.directories.forEach((item) => {
            if(item.name != directoryName && item.name.startsWith(directoryName) && item.name.trim() != ""){
                let name = item.name;
                if(name.indexOf(directoryName) == 0) name = name.substring(directoryName.length);
                if(name.indexOf("/") == 0) name = name.substring(1);
                if(!name.includes("/")) children.push(name);
            }
        });
        return children;
    }

    public async getFile(filePath: string) : Promise<JournalFile> {
        let directoryName = this.normalizePath(path.dirname(filePath));
        let fileName = path.basename(filePath);
        let directory = this.directories.find(d => d.name == directoryName);
        if(directory == null) return null;
        let file = new JournalFile();
        file.journalEntry = this.files.find(f => f.directory == directory.id && f.name == fileName);
        if(file.journalEntry == null) return null;
        file.parts = this.files.filter(f => f.directory == directory.id && f.name.indexOf(fileName+ ".part") == 0)
            .sort((a,b) => parseInt(a.name.split(".part").pop()) - parseInt(b.name.split(".part").pop()));
        file.directory = directory;
        return file;
    }

    public async getFiles(directoryName: string, ignorePartFiles = true) : Promise<Array<string>> {
        let directory = await this.getDirectory(directoryName);
        if(directory == null) return [];
        let files = this.files.filter(f => f.directory == directory.id).map(f => f.name);
        if(ignorePartFiles) files = files.map(f => f.replace(".part0","")).filter(f => !f.includes(".part"));
        return files;
    }

    public async deleteFile(filePath: string) : Promise<void> {
        console.log("Deleting file " + filePath);
        let existingFile = await this.getFile(filePath);
        if(existingFile == null) throw new Error("File not found");
        let files : FileJournalEntry[] = [existingFile.journalEntry].concat(existingFile.parts);
        let promises = [];
        for(let file of files){
            this.files = this.files.filter(f => f.mid != file.mid);
            let message = await this.channel.messages.fetch(file.mid);
            if(message != null) promises.push(message.delete());
        }
        await Promise.all(promises);
    }

    public async createFiles(filePath: string): Promise <stream.Duplex> {
        const fileStream = new FileStream({});

        fileStream.on('readytoread', () => this.createThumbnail(filePath, fileStream))

        return fileStream;
    }

    public createThumbnail(filePath: string, stream: FileStream): void {
        new ThumbnailGenerator().generateThumbnail(stream);
        /*.then((s) => {
            if (this.aesKey != null) {
                let iv = crypto.randomBytes(16);
                this.createFileImpl(filePath + '_thumb.jpg', stream.pipe(this.getCipher(iv)), iv);
            } else {
                this.createFileImpl(filePath + '_thumb.jpg', stream);
            }
        });
        */
    }

    public async createFile(filePath: string): Promise<stream.Writable> {
        let j = 0;

        return new SizeStream(25e+6, (stream) => {
            if (this.aesKey != null) {
                let iv = crypto.randomBytes(16);
                this.createFileImpl(filePath + (j == 0 ? "" : ".part" + j), stream.pipe(this.getCipher(iv)), iv);
            } else {
                this.createFileImpl(filePath + (j == 0 ? "" : ".part" + j), stream);
            }

            j++;
        });
    };

    private async createFileOnDiscord(fileName: string, directory: DirectoryJournalEntry, content: stream.Stream, iv: Buffer) {
        let entry: FileJournalEntry = new FileJournalEntry();
        
        if (iv != null) {
            entry.iv = iv.toString("hex");
        }

        entry.directory = directory.id;
        entry.name = fileName;

        let text = JSON.stringify(entry);
        let attachmentName = fileName;

        if (this.aesKey != null) {
            text = this.encrypt(text);
            attachmentName = this.encrypt(attachmentName);
        }

        let a = new Discord.AttachmentBuilder(content, {name: attachmentName});

        await this.channel.send({
            content: text,
            files: [a]
        }).then((message: Discord.Message) => { 
            let attachment = message.attachments.first();
            entry.size = attachment.size;
            entry.url = attachment.url;
            entry.mid = message.id;
            this.files.push(entry);
        })

        return entry;
    }

    private async createFileImpl(filePath: string, content: stream.Stream, iv: Buffer = null): Promise<FileJournalEntry> {
        let that = this;
       
        let directoryName = that.normalizePath(path.dirname(filePath));
        let fileName = path.basename(filePath);
        let directory = that.directories.find(d => d.name == directoryName);

        if (directory == null) directory = await that.createDirectory(directoryName);
        
        const thumbsDirectoryName = this.normalizePath(path.join(directoryName, '.thumbs'));
        const thumbsDirectory = that.directories.find(d => d.name == thumbsDirectoryName);

        const shouldCreateThumbsDir = thumbsDirectory == null && path.basename(directoryName) !== '.thumbs';

        if (shouldCreateThumbsDir) await that.createDirectory(thumbsDirectoryName);

        if (that.files.find(f => f.directory == directory.id && f.name == fileName)) {
            await that.deleteFile(filePath);
        }

        const entry = this.createFileOnDiscord(fileName, directory, content, iv);

        return entry;
    }

    public createDirectoryOnDiscord(directoryName: string) {
        console.log("Creating directory " + directoryName);
        let entry = new DirectoryJournalEntry();
        entry.id = uuidv4();
        entry.name = directoryName;
        let text = JSON.stringify(entry);

        if (this.aesKey != null) {
            text = this.encrypt(text);
        }

        return this.channel.send(text).then((message: Discord.Message) => {
            entry.mid = message.id;
            this.directories.push(entry);
            return entry;
        })
    }

    public async createDirectory(directoryName: string): Promise<DirectoryJournalEntry> {
        
        directoryName = this.normalizePath(directoryName);
        let existingDirectory = this.directories.find(d => d.name == directoryName);

        if (existingDirectory != null) {
            console.log("Not recreating directory because it already exists " + directoryName);
            return existingDirectory;
        }
    
        return this.createDirectoryOnDiscord(directoryName);
    }

    public async deleteDirectory(directoryName: string) {
        console.log("Deleting directory " + directoryName);
        directoryName = this.normalizePath(directoryName);
        let directory = this.directories.find(d => d.name == directoryName);
        this.directories = this.directories.filter(d => d.id != directory.id);
        
        try {
            let journalEntry = await this.channel.messages.fetch(directory.mid);
            if (journalEntry != null) journalEntry.delete();
        } catch (e) {
            console.error(e);
        }

    }
}

