var http = require('http')
var router = require('./routes')
var createClient = require('./../src/redis')
var sendResponse = require('./helpers').sendResponse

var client = createClient()

router.set('/favicon.ico', 'get', empty)
router.set('/buyers', 'post', function (request, response) {
  if (!request.body.id || !request.body.offers) {
    sendResponse(500, {error: 'Invalid buyer!'}, response)
  } else addBuyer(request.body, response)
})

router.set('/buyers/:id', 'get', function (request, response) {
  var id = request.additionalParams.id
  getBuyer(id, response)
})

router.set('/route', 'get', function (request, response) {
  if (!request.query.device && !request.query.state && !request.query.timestamp) {
    sendResponse(500, {error: 'Invalid request!'}, response)
  } else {
    var date = new Date(request.query.timestamp)
    getProduct(request.query.device, request.query.state, date.getUTCHours(), date.getUTCDay(), response)
  }
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

function empty (req, res) {
  sendResponse(204, {}, res)
}

function addBuyer (buyer, response) {
  var count = 0

  buyer.offers.forEach(function (value) {
    var key = [
      buyer.id,
      value.criteria.device.join(','),
      value.criteria.state.join(','),
      value.criteria.hour.join(','),
      value.criteria.day.join(',')
    ].join(':')

    client.set(key, JSON.stringify(value), function (error) {
      if (error) {
        sendResponse(500, error, response)
      } else count += 1

      if (count === buyer.offers.length) {
        sendResponse(201, {success: true}, response)
      }
    })
  })
}

function getBuyer (id, response) {
  client.scan('0', 'MATCH', id + ':*', 'COUNT', '100', function (error, data) {
    if (error) {
      sendResponse(500, error, response)
    } else {
      getOffers(data[1], response)
    }
  })
}

function getProduct (device, state, hour, day, response) {
  var query = '*:*' + device + '*:*' + state + '*:*' + hour + '*:*' + day + '*'
  client.scan('0', 'MATCH', query, 'COUNT', '100', function (reply, data) {
    if (data[1] && data[1].length) {
      // Find key with min parameters
      var maxSuitable = data[1][0]
      data[1].forEach(function (item) {
        if (item.length < maxSuitable.length) {
          maxSuitable = item
        }
      })

      client.get(maxSuitable, function (error, data) {
        if (error) {
          sendResponse(500, error, response)
        } else {
          response.setHeader('location', JSON.parse(data).location)
          sendResponse(302, {success: true}, response)
        }
      })
    } else {
      sendResponse(400, {error: 'Nothing found!'}, response)
    }
  })
}

function getOffers (keys, response) {
  var offers = []
  keys.forEach(function (value) {
    client.get(value, function (error, data) {
      if (error) {
        sendResponse(500, error, response)
      } else {
        offers.push(JSON.parse(data))
      }
      if (offers.length === keys.length) {
        sendResponse(200, {id: value.split(':')[0], offers: offers}, response)
      }
    })
  })
}

module.exports = createServer
