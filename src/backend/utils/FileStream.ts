import * as stream from "stream";

export default class FileStream extends stream.Duplex {
    private next: (error?: Error) => void;
    private buffer: Buffer;
    private callbackNotCalled = true;
    private canWrite = true;

    constructor(options: any) {
        super(options);
    }

    write(chunk: Buffer): any {
        this.buffer = chunk;

        if (this.callbackNotCalled) {
            this.emit('readytoread', this);
            this.callbackNotCalled = false;
        }

        console.log('writing: ', this.buffer);

        this.canWrite = false;
        return this.canWrite;
    }
    
    _read() {
        if (!this.buffer) {
            this.canWrite = true;
        } else {
            this.push(this.buffer);
            console.log('pushed', this.buffer)
            this.buffer = null;
        }
        /*
        if (this.buffer?.length) {
            this.push(this.buffer);
            console.log('psuhed, ', this.buffer)
            this.buffer = null;
        } else if (this.readyForNext) {
            this.readyForNext = false;
        }
        */
    }
}