function sendResponse (status, data, response) {
  response.writeHead(status)
  response.write(JSON.stringify(data))
  response.end()
}

module.exports = {
  sendResponse: sendResponse
}
