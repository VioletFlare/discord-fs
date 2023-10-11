import * as stream from "stream";

export default class WritableStream extends stream.Writable {
    private current: stream.Readable;
    private ready = false;
    private next: (error?: Error | null) => void;

    constructor(private cb: (stream: stream.Readable) => void) {
        super();
        this.once('finish', () => {
            if (this.current) this.current.push(null)
        })
    }

    _write(chunk: any, encoding: BufferEncoding, next: (error?: Error | null) => void) {
        if (chunk.length === 0) return next()

        let j;

        for (let i = 0; i < chunk.length; i = j) {

            if (!this.current) {
                this.cb(this.current = this.newReadable())
            }

            this.current.push(chunk)
        }

        this.current.push(null)

        this.advance(next)
    }

    advance(next: (error?: Error | null) => void) {
        if (this.current === null) {
            next()
        }
        else if (this.ready) {
            this.ready = false
            next()
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