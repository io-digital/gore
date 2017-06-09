
(async function() {

  'use strict'

  var gore = require('.')

  var {
    suite, runtime
  } = await gore().catch(function(err) {
    console.log(err)
    process.exit(1)
  })

  suite([
    {
      // this test case throws with language level error
      start_at: 'http://google.com',
      steps: [
        function() {
          return lajsdlfjsdlkf
        },
        function() {
          return true
        }
      ]
    },
    {
      // this test case throws on explicit navigation
      start_at: 'http://google.com',
      steps: [
        function() {
          return 'doesntexist'
        },
        function() {
          return true
        }
      ]
    },
    {
      // this test case doesn't follow the final-step boolean rule
      start_at: 'http://google.com',
      steps: [
        function() {
          return null
        }
      ]
    },
    {
      // this test case explicitly fails early
      start_at: 'http://google.com',
      steps: [
        function() {
          return false
        },
        function() {
          return true
        }
      ]
    },
    {
      description: 'run a google search',
      start_at: 'http://google.com',
      steps: [
        async function() {
          await runtime.eval(function() {
            var search_box = document.querySelector('#lst-ib')
            search_box.value = 'google'
            search_box.form.submit()
          })
        },
        async function() {
          var title = await runtime.eval(function() {
            return document.title
          })
          var number_of_results = await runtime.eval(function() {
            return document.querySelectorAll('.g').length
          })
          return (
            title === 'google - Google Search' &&
            number_of_results === 10
          )
        }
      ]
    }
  ])
})()