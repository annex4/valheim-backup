var https = require('https');

module.exports = {
    request: function (options, data, callback) {
        var req = https.request(options, function (res) {
            var body = [];

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
    },
    asyncRequest: function (options, data) {
        return new Promise(function (resolve, reject) {
            var req = https.request(options, function (res) {
                var body = [];

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
    },
    httpRequest: function (options, data, callback) {
        var req = http.request(options, function (res) {
            var body = [];

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
    },
    httpAsyncRequest: function (options, data) {
        return new Promise(function (resolve, reject) {
            var req = http.request(options, function (res) {
                var body = [];

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
}