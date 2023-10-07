const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

import * as stream from "stream";

export default class ThumbnailGenerator {

    constructor() {
        ffmpeg.setFfmpegPath(ffmpegStatic);
    }
    
    generateThumbnail(stream: stream.Stream): Promise<stream.Stream> {
        return new Promise((resolve) => {
            let output: stream.Stream;

            ffmpeg()
                .input(stream)
                .screenshots({
                    timestamps: ['50%'],
                    size: '320x240'
                })
                .output(output)
                .on('end', () => {
                    resolve(output);
                })
        });
    }

}