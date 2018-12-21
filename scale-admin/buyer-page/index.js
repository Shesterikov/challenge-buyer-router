function notification (el, status, msg) {
  el.innerText = msg
  el.classList.add('badge-' + status)
  setTimeout(function () {
    el.innerText = ''
    el.classList.remove('badge-' + status)
  }, 3000)
}
function setError (el) {
  el.classList.add('error')
}

function addBuyer () {
  removeError()

  var params = document.querySelector('#buyerInfo').value

  if (!params || !params.length) return setError(document.querySelector('#buyerInfo'))

  try {
    var data = JSON.parse(params)
    if (!data.id || !data.offers) {
      setError(document.querySelector('#buyerInfo'))
      notification(document.querySelector('span.add-status'), 'danger', 'Data is not valid!')
      return
    }
  } catch (e) {
    setError(document.querySelector('#buyerInfo'))
    notification(document.querySelector('span.add-status'), 'danger', 'This is not a JSON format!')
    return
  }

  sendRequest('POST', JSON.stringify({data: params}), '/buyers', function (data) {
    notification(document.querySelector('span.add-status'), 'success', data.msg)
    document.querySelector('#buyerInfo').value = ''
  }, function (data) {
    notification(document.querySelector('span.add-status'), 'danger', data.error || 'Something went wrong!')
  })
}

function sendRequest (method, params, path, cb, ecb) {
  var myHeaders = new Headers()
  myHeaders.append('Authorization', 'Bearer ' + window.localStorage.authToken)

  var fetchData = {
    crossDomain: true,
    method: method,
    headers: myHeaders
  }

  if (method !== 'GET') fetchData.body = params
  else path += params

  fetch('http://localhost:1338' + path, fetchData).then(function (response) {
    response.json().then(function (data) {
      if (response.status >= 400) {
        ecb(data)
      } else {
        cb(data)
      }
    })
  })
}

function getLocation () {
  removeError()

  var params = {
    device: document.querySelector('#device').value,
    state: document.querySelector('#state').value,
    timestamp: document.querySelector('#timestamp').value
  }

  if (!params.device) setError(document.querySelector('#device'))
  if (!params.state) setError(document.querySelector('#state'))

  try {
    params.timestamp = new Date(params.timestamp).toISOString()
  } catch (e) {
    setError(document.querySelector('#timestamp'))
    notification(document.querySelector('span.location-status'), 'danger', 'Date is not valid!')
  }

  if (document.querySelector('.error')) return

  var urlParams = '?timestamp=' + params.timestamp + '&state=' + params.state + '&device=' + params.device

  sendRequest('GET', urlParams, '/route', function (data) {
    document.querySelector('#json-label').innerText = 'Result for getting location by device and state'
    document.querySelector('#json').innerText = JSON.stringify(data, undefined, 2)
  }, function (data) {
    notification(document.querySelector('span.location-status'), 'danger', data.error || 'Something went wrong!')
    document.querySelector('#json-label').innerText = 'Result'
    document.querySelector('#json').innerText = ''
  })
}

function getBuyer () {
  removeError()

  var params = document.querySelector('#buyerID').value

  if (!params || !params.length) return setError(document.querySelector('#buyerID'))

  sendRequest('GET', '/' + params, '/buyers', function (data) {
    document.querySelector('#json-label').innerText = 'Result for getting Buyer by id'
    document.querySelector('#json').innerText = JSON.stringify(data, undefined, 2)
  }, function (data) {
    notification(document.querySelector('span.buyerID-status'), 'danger', data.error || 'Something went wrong!')
    document.querySelector('#json-label').innerText = 'Result'
    document.querySelector('#json').innerText = ''
  })
}

function removeError () {
  if (!document.querySelector('.error')) return
  document.querySelectorAll('.error').forEach(function (el) { el.classList.remove('error') })
}

function init () {
  document.body.addEventListener('focusin', function (ev) {
    var type = ev.target.nodeName.toLowerCase()
    if (type === 'input' || type === 'textarea') {
      removeError()
    }
  })
}
