angular.module('SecureChat').controller('Chat', ['$scope', '$http', 'Socket', function($scope, $http, Socket) {

    Socket.connect();

    var userId      = username,
        userToken   = token,
        keyManager  = null,
        keyRing     = new kbpgp.keyring.KeyRing,
        publicKey   = null,
        lastMessage = '',
        maxMessages = maxMessagesToShow;

    $scope.formData = {};
    $scope.ready    = false;
    $scope.messages = [];
    $scope.users    = [];


    $scope.sendMessage = function() {
        lastMessage = $scope.formData.message;

        Socket.emit('getClients', {});

        pushMessage('self', userId, lastMessage, false);
        $scope.formData.message = '';
    };



    // Receives a server message
    Socket.on('server_message', function(data) {
        pushMessage('server', data.username, data.text, false);
    });

    Socket.on('updateUserList', function(users) {
        $scope.users = users;
    });

    // Decrypts a message
    Socket.on('message', function(messageData) {
        var tmpKeyRing = keyRing;

        // first we need to get the public key of the user that send us the message
        $http({
            method  : 'POST',
            url     : '/key',
            data    : {clientId: messageData.clientId},
            headers : { 'Content-Type': 'application/json;charset=utf-8' }
        }).success(function(data) {
            if (data.success) {
                // import the his public key and decrypt the message
                kbpgp.KeyManager.import_from_armored_pgp({
                    armored: data.publicKey
                }, function(err, otherKeyManager) {
                    if (!err) {
                        tmpKeyRing.add_key_manager(otherKeyManager);

                        // Decrypt the message
                        kbpgp.unbox({
                            keyfetch: tmpKeyRing,
                            armored: messageData.message,
                        }, function(err, literals) {
                            if ( err != null ) {
                                return console.log("Problem: " + err);
                            } else {
                                // push the message to the view
                                var message = literals[0].toString();
                                pushMessage('user', messageData.username, message);
                            }
                        });
                    }
                });
            }
        });
    });

    // Encrypt the message for each client and send it to them
    Socket.on('getClientsResult', function(data) {
        for ( var i = 0; i < data.length; i++ ) {
            var clientId = data[i];

            // get his public key
            $http({
                method  : 'POST',
                url     : '/key',
                data    : {clientId: clientId},
                headers : { 'Content-Type': 'application/json;charset=utf-8' }
            }).success(function(data) {
                if (data.success) {
                    // make a new key manager
                    kbpgp.KeyManager.import_from_armored_pgp({
                        armored: data.publicKey
                    }, function(err, otherKeyManager) {
                        if (!err) {
                            var params = {
                                msg: lastMessage,
                                encrypt_for: otherKeyManager,
                            };

                            // encrypt the message
                            kbpgp.box(params, function(err, encryptedString, encryptedBuffer) {
                                // send the encrypted message to the user
                                Socket.emit('sendMessageToClient', {
                                    clientId: clientId,
                                    message: encryptedString
                                });
                            });
                        }
                    });
                }
            });
        }
    });



    // Push a message to the view
    var pushMessage = function(messageType, user, msg, apply = true) {
        // push the message
        $scope.messages.push({
            type: messageType,
            username: user,
            text: msg
        });

        // Limit message list
        $scope.messages = $scope.messages.slice(maxMessages * -1);

        // needs the scope to be updated?
        if ( apply ) $scope.$apply();

        // Scroll to bottom
        var element = document.getElementById("messageList");
        element.scrollTop = element.scrollHeight;
    };

    // Generates a key pair and
    var generateKey = function() {
        console.log('Generating key pair...');

        kbpgp.KeyManager.generate_rsa({ userid : userId }, function(err, generatedKeyManager) {
            generatedKeyManager.sign({}, function(err) {
                console.log('Key generated, exporting...');

                keyManager = generatedKeyManager;
                keyRing.add_key_manager(keyManager);

                // Send the public key to the server
                keyManager.export_pgp_public({}, function(err, pgp_public) {
                    console.log('Key exported, sending public key...');

                    publicKey = pgp_public;

                    var postData = {
                        username: userId,
                        token: userToken,
                        publicKey: pgp_public
                    };

                    // Send the public key to the server
                    Socket.emit('save_public_key', postData);

                    // Start the chat
                    $scope.ready = true;
                    $scope.$apply();
                });

            });
        });
    };

    // Let's start...
    generateKey();

}]);