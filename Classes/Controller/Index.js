module.exports = function(app, io, config) {

    var crypto = require('crypto');

    config.data.tokenList = [];

    // Send the current login password
    app.get('/' + config.passwordUrl, function(req, res) {
        res.send(config.password);
    });

    // Send the login
    app.get('/', function(req, res) {
        res.render('Index');
    });

    // Login mechanism
    app.post('/login', function(req, res) {
        var password = req.body.password;

        if ( password == config.password ) {
            // Generate login token
            var tokenStr = Math.random() + config.password + config.saltKey + Math.random(),
                token    = crypto.createHash('sha1').update(tokenStr, 'utf8').digest('hex');

            // Generate a token timeout
            var time                 = new Date(),
                numberOfMinutesToAdd = 1,
                timestamp            = 0,
                curTimestamp         = time.getTime();

            time.setTime(time.getTime() + (numberOfMinutesToAdd * 60 * 1000));
            timestamp = time.getTime();

            // check for timed out tokens
            var newTokenList = config.data.tokenList;
            for ( var i = 0; i < config.data.tokenList.length; i++ ) {
                if ( curTimestamp > config.data.tokenList[i] ) {
                    newTokenList.splice(i, 1);
                }
            }
            config.data.tokenList = newTokenList;

            // Save the new login token
            config.data.tokenList.push({
                token: token,
                timestamp: timestamp,
                username: req.body.username
            });

            // Send the token to the client
            res.send({
                success: true,
                token: token
            });
        } else {
            res.send({
                success: false
            });
        }
    });

};