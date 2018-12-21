var fs = require('fs')
var http = require('http')
var Authentic = require('authentic-server')

var auth = Authentic({
  db: __dirname + '/db',
  publicKey: fs.readFileSync(__dirname + '/rsa-public.pem'),
  privateKey: fs.readFileSync(__dirname + '/rsa-private.pem'),
  sendEmail: function (email, cb) {
    console.log(email)
    setImmediate(cb)
  }
})

var createServer = function () {
  return http.createServer(auth)
}

console.log('Authentic enabled server listening on port', 1337)

module.exports = createServer
