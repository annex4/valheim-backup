const HOST = process.env.HOST
const WORLD = process.env.WORLD
const USERNAME = process.env.USERNAME
const PASSWORD = process.env.PASSWORD

import { SFTPWrapper } from 'ssh2';
import * as Client from 'ssh2-sftp-client';

let sftp = new Client();

async function Connect() : Promise<SFTPWrapper> {
    return await sftp.connect({
        host: HOST,
        port: 22,
        username: USERNAME,
        password: PASSWORD
    })
}

async function GetCharacterFiles() : Promise<Client.FileInfo[]> {
    let characters = await sftp.list("/characters");

    return characters
}

async function GetCharacter(filename: string) {
    let data = await sftp.get(filename)

    return data;
}

async function GetWorld(type: string) {
    let data = await sftp.get(`/worlds/${WORLD}.${type}`);

    return data
}

export {
    Connect,
    GetWorld,
    GetCharacter,
    GetCharacterFiles
}
