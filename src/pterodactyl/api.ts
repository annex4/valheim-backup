const SERVER_ID = process.env.SERVER_ID
const API_KEY = process.env.API_KEY

const HOST = process.env.HOST
const WORLD = process.env.WORLD

import * as https from 'https';
import * as request from '../request';

async function GetCharacterFiles() {
    let characters = [];

    let result = await request.asyncRequest({
        hostname: HOST,
        port: 443,
        path: `/api/client/servers/${SERVER_ID}/files/list?directory=%2F.config%2Funity3d%2FIronGate%2FValheim%2Fcharacters`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + API_KEY,
            'User-Agent': 'AWSLambda/14.x'
        }
    })

    let files = result.body.data;

    for (let i = 0; i < files.length; i++) {
        let name = files[i].attributes.name

        if (name.endsWith('.fch')) {
            characters.push(files[i].attributes);
        }
    }

    return characters;
}

async function GetCharacter(filename: string) {
    console.log(`Request: /api/client/servers/${SERVER_ID}/files/download?file=%2F.config%2Funity3d%2FIronGate%2FValheim%2Fcharacters%2F${filename}`)

    let result = await request.asyncRequest({
        hostname: HOST,
        port: 443,
        path: `/api/client/servers/${SERVER_ID}/files/download?file=%2F.config%2Funity3d%2FIronGate%2FValheim%2Fcharacters%2F${filename}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + API_KEY,
            'User-Agent': 'AWSLambda/14.x'
        }
    })

    let url = result.body.attributes.url

    return new Promise((resolve, reject) => {
        https.get(url, (res) => {           
            let data: any[] = [];

            res.on('data', (chunk) => { data.push(chunk); });
            res.on('end', () => {
                try {
                    resolve(Buffer.concat(data))
                } catch (e) {
                    reject(e)
                }
            });
        }).on('error', (e) => {
            reject(e)
        });
    }); 
}

async function GetWorld(type: string) {
    console.log(`Request: /api/client/servers/${SERVER_ID}/files/download?file=%2F.config%2Funity3d%2FIronGate%2FValheim%2Fworlds%2F${WORLD}.${type}`)

    let result = await request.asyncRequest({
        hostname: HOST,
        port: 443,
        path: `/api/client/servers/${SERVER_ID}/files/download?file=%2F.config%2Funity3d%2FIronGate%2FValheim%2Fworlds%2F${WORLD}.${type}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + API_KEY,
            'User-Agent': 'AWSLambda/14.x'
        }
    })

    let url = result.body.attributes.url

    return new Promise((resolve, reject) => {
        https.get(url, (res) => {           
            let data: any[] = [];

            res.on('data', (chunk) => { data.push(chunk); });
            res.on('end', () => {
                try {
                    resolve(Buffer.concat(data))
                } catch (e) {
                    reject(e)
                }
            });
        }).on('error', (e) => {
            reject(e)
        });
    });
}

export {
    GetWorld,
    GetCharacter,
    GetCharacterFiles
}