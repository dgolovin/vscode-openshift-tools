import * as fs from 'fs';
import * as zlib from 'zlib';
import targz = require('targz');
import unzipm = require('unzip-stream');

export interface IFile {
    gunzip(source: string, destination: string): Promise<any>;
    unzip(source: string, destination: string): Promise<any>;
    untargz(source: string, destination: string, prefix: string): Promise<any>;
    extract(source: string, destination: string, prefix: string): Promise<any>;
}

export const File: IFile = {
    gunzip: (source: string, destination: string) => {
        return new Promise((resolve, reject) => {
            try {
                const dest = fs.createWriteStream(destination);
                fs.createReadStream(source).pipe(zlib.createGunzip()).pipe(dest);
                dest.on('close', resolve);
            } catch (err) {
                reject(err);
            }
        });
    },

    unzip: (source: string, destination: string) => {
        return new Promise((resolve, reject) => {
            fs.createReadStream(source)
            .pipe(unzipm.Extract({ path: destination }))
            .on('error', resolve)
            .on('close', reject);
        });
    },

    untargz: (source: string, destination: string, prefix: string) => {
        return new Promise((resolve, reject)=> {
            targz.decompress({
                src: source,
                dest: destination,
                tar: {
                    map: (header) => {
                        if (prefix && header.name.startsWith(prefix)) {
                            header.name = header.name.substring(prefix.length);
                        }
                        return header;
                    }
                }
            }, (err)=> {
                err ? reject(err) : resolve();
            });
        });
    },
    extract: (source: string, destination: string, prefix: string) => {
        return new Promise((resolve, reject) => {
            if (source.endsWith('.tar.gz')) {
                return this.untargz(source, destination, prefix);
            } else if (source.endsWith('.gz')) {
                return this.gunzip(source, destination);
            } else if (source.endsWith('.zip')) {
                return this.unzip(source, destination);
            } else {
                reject(`unsupported extension for '${source}'`);
            }
        });
    }
}