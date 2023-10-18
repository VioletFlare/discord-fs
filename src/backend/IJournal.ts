import * as stream from "stream";
import { DirectoryJournalEntry } from "./DirectoryJournalEntry";
import { JournalFile } from "./JournalFile"
import WritableStream from "./utils/WritableStream";

export default interface IJournal{
    getDirectory(directoryName: string) : Promise<DirectoryJournalEntry>
    getFile(pathName: string): Promise<JournalFile>
    download(file: JournalFile, offset?: number) : Promise<stream.Readable>
    getFile(filePath: string) : Promise<JournalFile>
    getFiles(directoryName: string, ignorePartFiles?: boolean) : Promise<Array<string>>
    deleteFile(filePath: string): Promise<void>
    deleteDirectory(pathName: string) : Promise<void>
    createFile(filePath: string): Promise<stream.Writable>
    createFiles(filePath: string): Promise<stream.Writable>
    createThumbnail(filePath:string, stream: stream.Readable): void
    createDirectory(directoryName: string): Promise<DirectoryJournalEntry>
    getChildDirectories(directoryName: string) : Promise<Array<string>>
}