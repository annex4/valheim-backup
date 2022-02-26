import * as https from 'https';

function request(options : https.RequestOptions, data: string, callback: Function) {
    var req = https.request(options, function (res) {
        var body : any[] = [];

        // Set the data encoding
        res.setEncoding('utf8');

        // Handle chunked data
        res.on('data', function (data) {
            body.push(data);
        });

        // Finish the response and notify the callback
        res.on('end', function () {
            var response = {
                code: res.statusCode,
                headers: res.headers,
                body: body.join("")
            }

            var strBody = body.join("");

            if (res.headers['content-type'] && res.headers['content-type'].indexOf('application/json') !== -1) {
                strBody = JSON.parse(strBody);
            }

            if (callback) {
                callback(null, response, strBody)
            }
        });
    });

    req.on('error', function (e) {
        if (callback) {
            callback(e);
        }
    });

    if (data) {
        req.write(data);
    }

    req.end();
}

function asyncRequest(options : https.RequestOptions, data?: string) : Promise<HTTPResponse> {
    return new Promise(function (resolve, reject) {
        var req = https.request(options, function (res) {
            var body : any[] = [];

            // Set the data encoding
            res.setEncoding('utf8');

            // Handle chunked data
            res.on('data', function (data) {
                body.push(data);
            });

            // Finish the response and notify the callback
            res.on('end', function () {
                var response = {
                    code: res.statusCode,
                    headers: res.headers,
                    body: body.join("")
                }

                var strBody = body.join("");

                if (res.headers['content-type'] && res.headers['content-type'].indexOf('application/json') !== -1) {
                    response.body = JSON.parse(strBody);
                }

                resolve(response);
            });
        });

        req.on('error', function (e) {
            reject(e);
        });

        if (data) {
            req.write(data);
        }

        req.end();
    });
}

export {
    request,
    asyncRequest
}