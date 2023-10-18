const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

import WritableStream from "./WritableStream";

import * as stream from "stream";

export default class ThumbnailGenerator {

    constructor() {
        ffmpeg.setFfmpegPath(ffmpegStatic);
    }

    async getVideoMetaData(stream: stream.Readable){
        return new Promise((resolve, reject) => {
          ffmpeg.ffprobe(stream, (err: any, meta: any)=>{
            resolve(meta);
          })
       })
      }
    
    generateThumbnail(s: stream.Readable): Promise<boolean> {
        return new Promise(async (resolve) => {
            /*
            this.getVideoMetaData(s).then((metadata: any) => {

            })
            */

            await stream.pipeline(s, fs.createWriteStream('out.mkv'), () => {});

            /*
            if (s !== null) {
                ffmpeg(s)
                .screenshots({
                    timestamps: [30],
                    size: '320x240',
                    filename: 'example.jpg'
                })
                .on('end', () => {
                    resolve(true);
                })
            }
            */
        });
    }

}