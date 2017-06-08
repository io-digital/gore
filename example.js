
(async function() {

  'use strict'

  var headless_testing = require('.')

  var {
    tests, page, dom,
    network, runtime,
    input, kill
  } = await headless_testing().catch(function(err) {
    console.log(err)
    process.exit(1)
  })

  tests([{
    description: 'foo',
    start_at: 'http://google.com',
    steps: [
      async function() {
        // return null to indicate manual navigation
        // return string to navigate
        // return true to pass
        // return false to fail
        console.log(1)
        return 'http://google.com/#q=a'
      },
      async function() {
        console.log(2)
        return 'http://google.com/#q=b'
      },
      async function() {
        console.log(3)
        return true
      }
    ]
  }, {
    description: 'bar',
    start_at: 'http://google.com',
    steps: [
      async function() {
        // return null to indicate manual navigation
        // return string to navigate
        // return true to pass
        // return false to fail
        console.log(4)
        return 'http://google.com/#q=c'
      },
      async function() {
        console.log(5)
        return 'http://google.com/#q=d'
      },
      async function() {
        console.log(6)
        return true
      }
    ]
  }])

})()