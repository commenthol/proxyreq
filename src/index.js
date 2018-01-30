/* eslint no-console:'off' */

const request = require('superagent')

module.exports = proxyReq

function proxyReq (req, res) {
  const {url} = req
  const method = req.method.toLowerCase()
  // const {
  //   host,
  //   ...headers
  // } = req.headers
  const clientReq = request[method](url).set(req.headers).buffer(true)
  clientReq.on('response', (_res) => {
    let {status, body} = _res
    if (res.finished) return
    res.statusCode = status
    res.setHeader('Content-Type', _res.headers['content-type'])
    if (typeof body !== 'string') {
      body = JSON.stringify(body)
    }
    if (body) res.write(body)
    res.end()
  })
  clientReq.on('error', (err) => {
    console.log('error %s', err)
    if (res.finished) return
    res.statusCode = 503
    res.end()
  })
  req.pipe(clientReq)
}
