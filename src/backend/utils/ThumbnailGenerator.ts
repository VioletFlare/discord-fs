const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

import * as path from "path";
import * as os from "os";

class ThumbnailGenerator {

    constructor() {
        ffmpeg.setFfmpegPath(ffmpegStatic);
    }
    
    generateThumbnail(filePath: string) {
        const thumbName = path.join(path.basename(filePath), '_thumb');
        const tempDir = path.join(os.tmpdir(), "discordfs");

        ffmpeg()
            .input(filePath)
            .screenshots({
                timestamps: ['50%'],
                filename: thumbName,
                folder: tempDir,
                size: '320x240'
            })
            .on('end', function() {
                
            });
    }

}