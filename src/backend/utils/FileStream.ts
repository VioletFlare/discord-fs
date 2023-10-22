import * as stream from "stream";

export default class FileStream extends stream.Duplex {
    private callbackNotCalled = true;
    private canWrite = true;

    constructor(options: any) {
        super(options);
    }

    write(chunk: Buffer): any {
        if (this.callbackNotCalled) {
            this.emit('readytoread', this);
            this.callbackNotCalled = false;
        }

        if (this.closed) {
            this.canWrite = false;
        }

        this.push(chunk);

        return this.canWrite;
    }
    
    _read() {}
}