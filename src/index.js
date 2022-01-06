const SERVER_ID = process.env.SERVER_ID
const API_KEY = process.env.API_KEY
const HOST = process.env.HOST
const WORLD = process.env.WORLD
const BUCKET = process.env.BUCKET
const REGION = process.env.REGION

const request = require('./request');
const https = require('https')

// Load the AWS SDK for Node.js and set the region
const AWS = require('aws-sdk');
      AWS.config.update({ region: REGION });

const s3 = new AWS.S3()

function SaveToS3(content, time, name) {
    return new Promise(function (resolve, reject) {
        s3.putObject({
            Bucket: BUCKET,
            Key: `backups/${WORLD}/${time}/${name}`,
            Body: content
        }, function (err, data) {
            if (err) {
                reject(err)
            } else {
                resolve(data);
            }
        });
    })
}

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

async function GetCharacter(filename) {
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
            let data = [];

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

async function GetWorld(type) {
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
            let data = [];

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

function GetDateString(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

exports.handler = async (event) => {
    try {
        let now = new Date();
        let date = GetDateString(now)

        let world = await Promise.all([
            GetWorld('db'),
            GetWorld('fwl')
        ])

        let saves = [
            SaveToS3(world[0], date, `${WORLD}.db`),
            SaveToS3(world[1], date, `${WORLD}.fwl`)
        ]

        let characterFiles = await GetCharacterFiles();

        for (let i = 0; i < characterFiles.length; i++) {
            let file = characterFiles[i];
            let data = await GetCharacter(file.name);

            saves.push(SaveToS3(data, date, `characters/${now.getHours()}/${file.name}`));
        }

        let save = await Promise.all(saves)

        return {
            statusCode: 200,
            body: JSON.stringify(`Cloned world to S3 for ${date}`),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify(err)
        }
    }
};

