const SERVER_ID = process.env.SERVER_ID
const API_KEY = process.env.API_KEY
const HOST = process.env.HOST
const WORLD = process.env.WORLD
const BUCKET = process.env.BUCKET
const REGION = process.env.REGION
const WEBHOOK_ID = process.env.WEBHOOK_ID
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN

const request = require('./request');
const https = require('https')

// Load the AWS SDK for Node.js and set the region
const AWS = require('aws-sdk');
      AWS.config.update({ region: REGION });

const s3 = new AWS.S3()

function GetPresignedURL(time, name) {
    var params = {
      Bucket: BUCKET,
      Key: `backups/${WORLD}/${time}/${name}`,
      Expires: 2678400 // 31 days
    }
    
    return s3.getSignedUrlPromise('getObject', params);
}

function NotifyDiscord(name, date, url) {
    return request.asyncRequest({
        hostname: 'discord.com',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        path: `/api/webhooks/${WEBHOOK_ID}/${WEBHOOK_TOKEN}`
    }, JSON.stringify({
        content: `[${date} | ${name}](${url})`
    }))
}

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

        // Retrieve world data
        let world = await Promise.all([
            GetWorld('db'),
            GetWorld('fwl')
        ])

        // Prepare to save them to S3, we'll do this in one batch via Promise.All
        let saves = [
            SaveToS3(world[0], date, `${WORLD}.db`),
            SaveToS3(world[1], date, `${WORLD}.fwl`)
        ]

        // Names to be used for discord notifications
        let names = [
            `${WORLD}.db`,
            `${WORLD}.fwl`
        ]

        // Retrieve all of the character file names from the server
        let characterFiles = await GetCharacterFiles();

        // Loop through each file name and download the character data
        for (let i = 0; i < characterFiles.length; i++) {
            let file = characterFiles[i];
            let data = await GetCharacter(file.name);

            // Save the character to S3
            saves.push(SaveToS3(data, date, `characters/${now.getHours()}/${file.name}`));
            
            // Add the character name to the discord notification names
            names.push(file.name.split("_")[1]);
        }

        let saveResults = await Promise.all(saves)

        // Get presigned URLs for the world data
        let urls = [
            GetPresignedURL(date, `${WORLD}.db`),
            GetPresignedURL(date, `${WORLD}.fwl`),
        ];

        // Get presigned URLs for the character data
        for (let i = 0; i < characterFiles.length; i++) {
            urls.push(GetPresignedURL(date, `characters/${now.getHours()}/${characterFiles[i].name}`));
        }

        let urlResults = await Promise.all(urls);

        // Notify Discord of the new files.
        for (let i = 0; i < urlResults.length; i++) {
            await NotifyDiscord(names[i] || 'Unknown', date, urlResults[i]);
        }

        return {
            statusCode: 200,
            body: JSON.stringify(`Backup Successful`),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify(err)
        }
    }
};

