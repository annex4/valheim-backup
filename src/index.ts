const WORLD = process.env.WORLD
const BUCKET = process.env.BUCKET
const REGION = process.env.REGION
const WEBHOOK_ID = process.env.WEBHOOK_ID
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN

import * as request from './request';

import { Connect, GetCharacter, GetCharacterFiles, GetWorld } from "./sftp/api"

// Load the AWS SDK for Node.js and set the region
const AWS = require('aws-sdk');
      AWS.config.update({ region: REGION });

const s3 = new AWS.S3()

function GetPresignedURL(time: string, name: string) {
    var params = {
      Bucket: BUCKET,
      Key: `backups/${WORLD}/${time}/${name}`,
      Expires: 2678400 // 31 days
    }
    
    return s3.getSignedUrlPromise('getObject', params);
}

function NotifyDiscord(name: string, date: string, url: string) {
    return request.asyncRequest({
        hostname: 'discord.com',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        path: `/api/webhooks/${WEBHOOK_ID}/${WEBHOOK_TOKEN}`
    }, JSON.stringify({
        content: `[${date} | ${name}](${url})`
    }))
}

function SaveToS3(content: any, time: string, name: string) {
    return new Promise(function (resolve, reject) {
        s3.putObject({
            Bucket: BUCKET,
            Key: `backups/${WORLD}/${time}/${name}`,
            Body: content
        }, function (err: any, data: any) {
            if (err) {
                reject(err)
            } else {
                resolve(data);
            }
        });
    })
}

function GetDateString(date: Date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

exports.handler = async () => {
    try {
        let now = new Date();
        let date = GetDateString(now)

        console.log("Connecting ...")

        let client = await Connect()

        console.log("Connected")

        console.log("Retrieving worlds ...")

        // Retrieve world data
        let world = await Promise.all([
            GetWorld('db'),
            GetWorld('fwl')
        ])

        console.log("Retrieved worlds");

        console.log("Saving worlds ...");

        // Prepare to save them to S3, we'll do this in one batch via Promise.All
        let saves = [
            SaveToS3(world[0], date, `${WORLD}.db`),
            SaveToS3(world[1], date, `${WORLD}.fwl`)
        ]

        console.log("Saved worlds");

        // Names to be used for discord notifications
        let names = [
            `${WORLD}.db`,
            `${WORLD}.fwl`
        ]

        // Retrieve all of the character file names from the server
        /* let characterFiles = await GetCharacterFiles();

        // Loop through each file name and download the character data
        for (let i = 0; i < characterFiles.length; i++) {
            let file = characterFiles[i];
            let data = await GetCharacter( file.name);

            // Save the character to S3
            saves.push(SaveToS3(data, date, `characters/${now.getHours()}/${file.name}`));
            
            // Add the character name to the discord notification names
            names.push(file.name.split("_")[1]);
        }*/

        let saveResults = await Promise.all(saves)

        // Get presigned URLs for the world data
        let urls = [
            GetPresignedURL(date, `${WORLD}.db`),
            GetPresignedURL(date, `${WORLD}.fwl`),
        ];

        // Get presigned URLs for the character data
        /*
        for (let i = 0; i < characterFiles.length; i++) {
            urls.push(GetPresignedURL(date, `characters/${now.getHours()}/${characterFiles[i].name}`));
        }*/

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

