const http = require('http')
const assert = require('assert')
const request = require('supertest')
const proxyReq = require('..')
const {series} = require('asyncc')

const express = require('express')

describe('proxyreq', function () {
  before((done) => {
    series([
      server,
      endpoint
    ], done)
  })
  after((done) => {
    series([
      (done) => server.server.close(done),
      (done) => endpoint.server.close(done)
    ], done)
  })

  it('endpoint shall mirror', function (done) {
    request('http://localhost:4000')
      .get('/api/a/path')
      .expect(res => {
        assert.ok(res.body)
        assert.equal(res.body.method, 'GET')
        assert.equal(res.body.url, '/api/a/path')
        assert.equal(res.body.body, '')
      })
      .expect('Content-Type', /json/)
      .end(done)
  })

  describe('proxy', function () {
    server.fn = (req, res) => { // inject middleware
      // console.log(req.url, req.headers)
      req.url = 'http://localhost:4000/test'
      req.headers.host = 'localhost:4000'
      proxyReq(req, res)
    }
    it('should proxy GET req', function (done) {
      request('http://localhost:3000')
        .get('/api/a/path')
        .expect(res => {
          assert.ok(res.body)
          assert.equal(res.body.method, 'GET')
          assert.equal(res.body.url, '/test')
          assert.equal(res.body.body, '')
        })
        .end(done)
    })

    it('should proxy POST req', function (done) {
      request('http://localhost:3000')
        .post('/api/a/path')
        .send('haha=1&lala=2')
        .expect(res => {
          assert.ok(res.body)
          assert.equal(res.body.method, 'POST')
          assert.equal(res.body.url, '/test')
          assert.equal(res.body.body, 'haha=1&lala=2')
        })
        .end(done)
    })

    it('should handle error req', function (done) {
      request('http://localhost:3000')
        .post('/api/a/path')
        .send('destroy=1')
        .expect(503)
        .end(done)
    })
  })
})

function server (done) {
  const app = express()
  app.use((req, res) => {
    server.fn(req, res)
  })
  server.server = http.createServer(app)
  server.server.listen(3000, done)
}

const bodyParse = (req, res, next) => {
  const data = []
  req.on('data', (chunk) => data.push(chunk))
  req.on('end', () => {
    req.body = Buffer.concat(data).toString()
    next()
  })
}
function endpoint (done) {
  const app = endpoint.app = express()
  app.use(bodyParse, (req, res) => {
    const {method, url, body, headers} = req
    if (body === 'destroy=1') {
      res.destroy()
      return
    }

    res.setHeader('Content-Type', 'application/json')
    res.write(JSON.stringify({method, url, headers, body}))
    res.end()
  })
  endpoint.server = http.createServer(app)
  endpoint.server.listen(4000, done)
}
