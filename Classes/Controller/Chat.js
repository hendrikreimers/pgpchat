module.exports = function(app, io, config) {

    config.data.publicKeys = {};
    config.data.clients = {};

    // Send the current login password
    app.get('/chat/:token', function(req, res) {
        var userToken    = req.params.token,
            time         = new Date(),
            curTimestamp = time.getTime(),
            newTokenList = [],
            success      = false,
            username     = '';

        // Check the token list
        for ( var i = 0; i < config.data.tokenList.length; i++ ) {
            if ( curTimestamp < config.data.tokenList[i].timestamp ) {
                if ( userToken == config.data.tokenList[i].token ) {
                    success  = true;
                    username = config.data.tokenList[i].username;
                } else {
                    newTokenList.push(config.data.tokenList[i]);
                }
            }
        }
        config.data.tokenList = newTokenList;

        // Show the chat on success
        if ( success == true ) {
            res.render('Chat', {
                token: userToken,
                username: username,
                maxMessages: config.maxMessages
            });
        } else {
            res.redirect('/');
        }
    });

    // Get the public key of a specific user
    app.post('/key', function(req, res) {
        var clientId = req.body.clientId;
        var publicKey = config.data.publicKeys[clientId].publicKey;

        res.send({
            success: true,
            publicKey: publicKey
        });
    });



    io.on('connection', function(client) {
        client.emit('ready', client.id);

        config.data.publicKeys[client.id] = {};
        config.data.clients[client.id]    = client;

        // Save the client token
        client.on('save_public_key', function(data) {
            config.data.publicKeys[client.id] = {
                username: data.username,
                token: data.token,
                publicKey: data.publicKey
            };

            io.sockets.emit('server_message', {
                username: '[SYSTEM]',
                text: 'User "' + config.data.publicKeys[client.id].username + '" connected!'
            });

            // Send new userlist
            var userList = [];
            for ( var i in config.data.publicKeys ) {
                userList.push({
                    username: config.data.publicKeys[i].username
                });
            }
            io.sockets.emit('updateUserList', userList);
        });

        // Sends a list of connected clients
        client.on('getClients', function() {
            var clientList = [];

            for ( var clientId in config.data.clients ) {
                if ( clientId != client.id ) {
                    clientList.push(clientId);
                }
            }

            client.emit('getClientsResult', clientList);
        });

        // Sends an encrypted message to the other user
        client.on('sendMessageToClient', function(data) {
            io.sockets.connected[data.clientId].emit('message', {
                username: config.data.publicKeys[client.id].username,
                clientId: client.id,
                message: data.message
            });
        });

        // Disconnect user and remove his publicKey data
        client.on('disconnect', function () {
            if ( client.id && config.data.publicKeys[client.id] ) {
                io.sockets.emit('server_message', {
                    username: '[SYSTEM]',
                    text: 'User "' + config.data.publicKeys[client.id].username + '" disconnected!'
                });

                delete config.data.publicKeys[client.id];
                delete config.data.clients[client.id];

                // Send new userlist
                var userList = [];
                for ( var i in config.data.publicKeys ) {
                    userList.push({
                        username: config.data.publicKeys[i].username
                    });
                }
                io.sockets.emit('updateUserList', userList);
            }
        });
    });

};