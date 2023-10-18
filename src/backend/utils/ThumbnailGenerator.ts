const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

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
    
    generateThumbnail(stream: stream.Readable): Promise<boolean> {
        return new Promise((resolve) => {
            /*
            this.getVideoMetaData(stream).then((metadata: any) => {

            })
            */

            ffmpeg()
            .input(stream)
            .screenshots({
                timestamps: [30],
                size: '320x240',
                filename: 'example.jpg'
            })
            .on('end', () => {
                resolve(true);
            })
        });
    }

}