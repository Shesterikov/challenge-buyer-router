var parser = require('url')
var sendResponse = require('./helpers').sendResponse

function parseBody (request, response, cb) {
  var body = ''

  request.on('data', function (data) {
    body += data
  })

  request.on('end', function () {
    try {
      request.body = JSON.parse(body)
      cb(request, response)
    } catch (e) {
      sendResponse(500, e, response)
    }
  })
}

var router = {
  routes: {},
  routeHandler: function (request, response) {
    var url = parser.parse(request.url, true)
    request.query = url.query

    if (url.pathname.match(/\/\w+\/\w+$/)) {
      request.additionalParams = {
        id: url.pathname.match(/\/\w+$/)[0].slice(1)
      }
      url.pathname = url.pathname.replace(/\w+$/, ':id')
    }

    if (this.routes[url.pathname] && this.routes[url.pathname][request.method]) {
      if (request.method === 'POST') {
        parseBody(request, response, this.routes[url.pathname][request.method])
      } else {
        this.routes[url.pathname][request.method](request, response)
      }
    } else {
      sendResponse(404, {error: 'Route is not find!'}, response)
    }
  },
  set: function (path, method, handler) {
    method = method.toUpperCase()
    path = path.toLowerCase()

    if (this.routes[path]) {
      this.routes[path][method] = handler
      return
    }

    this.routes[path] = {
      [method]: handler
    }
  }

}

module.exports = router
