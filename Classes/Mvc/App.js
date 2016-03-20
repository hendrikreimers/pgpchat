
var fs = require('fs');

module.exports = {

    autoload: function(path, callback) {
        if ( path == undefined ) return {};

        var objResult = {};

        fs.readdirSync(path).forEach(function(fileName) {
            if ( fileName.substr(-3) == '.js' ) {
                var fileAbsName = path + '/' + fileName;
                var confName    = fileName.slice(0, -3);

                objResult[confName] = require(fileAbsName);
            }
        });

        if ( callback ) callback(objResult);

        return this;
    }

};
