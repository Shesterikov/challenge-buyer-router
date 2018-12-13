var server = require('./lib/server')
var port = process.env.PORT || 5000
server().listen(port)
console.log('Test server', 'listening on port', port)
