import * as stream from "stream";

export default class WritableStream extends stream.Writable {
    public current: stream.Readable;
    private next: (error?: Error | null) => void;
    private ready = false;

    constructor() {
        super();

        this.current = this.newReadable();

        this.once('finish', () => {
            if (this.current) this.current.push(null)
        })
    }

    _write(chunk: any, encoding: BufferEncoding, next: (error?: Error | null) => void) {
        if (chunk.length === 0) return next()

        this.current.push(chunk)

        this.advance(next)
    }

    advance(next: (error?: Error | null) => void) {
        next()

        if (this.ready) {
            this.ready = false
        }
        else this.next = next
    }

    newReadable() {
        let r = new stream.Readable
        r._read = () => {
            let n = this.next
            if (n) {
                this.next = null
                n()
            }
            else this.ready = true
        }
        return r
    }
}