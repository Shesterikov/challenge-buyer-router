var http = require('http')
var router = require('./routes')
var createClient = require('./../src/redis')
var sendResponse = require('./helpers').sendResponse

var client = createClient()

router.set('/buyers', 'post', function (request, response) {
  if (!request.body.id || !request.body.offers) {
    sendResponse(500, { error: 'Invalid buyer!' }, response)
    return
  }
  addBuyer(request.body, response)
})

router.set('/buyers/:id', 'get', function (request, response) {
  var id = request.additionalParams.id
  getBuyer(id, response)
})

router.set('/route', 'get', function (request, response) {
  if (!request.query.device && !request.query.state && !request.query.timestamp) {
    sendResponse(500, {error: 'Invalid request!'}, response)
  }

  var date = new Date(request.query.timestamp)
  getProduct(request.query.device, request.query.state, date.getUTCHours(), date.getUTCDay(), response)
})

function createServer () {
  return http.createServer(function (request, response) {
    response.setHeader('Access-Control-Allow-Headers', 'authorization, accept, content-type')
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Request-Method', '*')
    response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST')
    response.setHeader('Access-Control-Allow-Headers', '*')
    response.setHeader('Content-Type', 'application/json')

    router.routeHandler(request, response)
  })
}

function addBuyer (buyer, response) {
  var idKey = 'id:' + buyer.id
  var multi = client.multi()

  buyer.offers.map(function (item) {
    var count = 0
    multi.sadd(idKey, item.location)

    for (var key in item.criteria) {
      item.criteria[key].forEach(function (value) {
        count += 1
        multi.sadd(key + ':' + value, item.location)
      })
    }

    multi.set(item.location, JSON.stringify(item))
    multi.zadd('count', count, item.location)
  })

  multi.exec((err, data) => {
    if (err) {
      sendResponse(500, err, response)
    }

    sendResponse(201, data, response)
  })
}

function getBuyer (id, response) {
  client.send_command('sinter', ['id:' + id], function (error, locations) {
    if (error) {
      sendResponse(500, error, response)
    }

    client.mget(locations, function (error, offers) {
      if (error) {
        sendResponse(500, error, response)
      }

      offers = offers.map(function (item) {
        return JSON.parse(item)
      })

      sendResponse(200, { offers: offers, id: id }, response)
    })
  })
}

function getProduct (device, state, hour, day, response) {
  var args = ['tmpkey', 5, 'state:' + state, 'hour:' + hour, 'day:' + day, 'device:' + device, 'count', 'aggregate', 'max']

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

      response.setHeader('location', data[data.length - 1])
      sendResponse(302, data, response)
    })
  })
}

module.exports = createServer
