var server = require('./lib/server')
var serverTest2 = require('./scale-auth/server')
var port = process.env.PORT || 1338
server().listen(port)
serverTest2().listen(1337)
console.log('Test server', 'listening on port', port)
