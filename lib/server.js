var http = require('http')
var Authentic = require('authentic-service')
var router = require('./routes')
var createClient = require('./../src/redis')
var sendResponse = require('./helpers').sendResponse

var client = createClient()
var auth = Authentic({
  server: 'http://localhost:1337'
})

router.set('/buyers', 'post', function (request, response) {
  request.body.data = JSON.parse(request.body.data)
  if (!request.body.data.id || !request.body.data.offers) return sendResponse(500, {error: 'Invalid buyer!'}, response)

  addBuyer(request.authData, request.body.data, response)
})

router.set('/buyers/:id', 'get', function (request, response) {
  var id = request.additionalParams.id

  getBuyer(id, request.authData.email, response)
})

router.set('/route', 'get', function (request, response) {
  if (!request.query.device && !request.query.state && !request.query.timestamp) return sendResponse(500, {error: 'Invalid request!'}, response)

  var date = new Date(request.query.timestamp)
  getProduct(request.query.device, request.query.state, date.getUTCHours(), date.getUTCDay(), request.authData.email, response)
})

var createServer = function () {
  return http.createServer(function (request, response) {
    auth(request, response, function (err, authData) {
      if (err) return sendResponse(500, err, response)

      if (!authData) return sendResponse(401, {error: 'Not authenticated.'}, response)

      request.authData = authData
      router.routeHandler(request, response)
    })
  })
}

function addBuyer (authData, buyer, response) {
  var idKey = 'id:' + buyer.id
  var emailKey = 'email:' + authData.email
  var multi = client.multi()

  buyer.offers.map(function (item) {
    var count = 0
    multi.sadd(idKey, item.location)
    multi.sadd(emailKey, item.location)

    for (var key in item.criteria) {
      item.criteria[key].forEach(function (value) {
        count += 1
        multi.sadd(key + ':' + value, item.location)
      })
    }

    multi.set(item.location, JSON.stringify(item))
    multi.zadd('count', count, item.location)
  })

  multi.exec(function (err, data) {
    if (err) {
      sendResponse(500, err, response)
    }
    sendResponse(201, {msg: 'Buyer added successfully'}, response)
  })
}

function getBuyer (id, email, response) {
  client.send_command('sinter', ['id:' + id, 'email:' + email], function (error, locations) {
    if (error) {
      sendResponse(500, error, response)
    }

    if (!locations.length) return sendResponse(500, {error: 'Not fount'}, response)

    client.mget(locations, function (error, offers) {
      if (error) return sendResponse(500, error, response)

      if (!offers) return sendResponse(500, {error: 'Not fount'}, response)

      offers = offers.map(function (item) {
        return JSON.parse(item)
      })

      var data = Object.assign({ id: id }, { offers: offers })
      sendResponse(200, data, response)
    })
  })
}

function getProduct (device, state, hour, day, email, response) {
  var args = ['tmpkey', 6, 'email:' + email,'state:' + state, 'hour:' + hour, 'day:' + day, 'device:' + device, 'count', 'aggregate', 'max']
  client.send_command('zinterstore', args, function (error) {
    if (error) {
      sendResponse(500, error, response)
      return
    }

    client.send_command('zrevrange', ['tmpkey', 0, -1], function (error, data) {
      if (error) {
        sendResponse(500, error, response)
        return
      }
      if (!data[data.length - 1]) {
        sendResponse(500, {error: 'Not fount'}, response)
      } else {
        sendResponse(302, {location: data[data.length - 1]}, response)
      }
    })
  })
}

console.log('Protected microservice listening on port', 1338)

module.exports = createServer
