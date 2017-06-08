
(async function() {

  'use strict'

  var gore = require('.')

  var {
    suite, runtime
  } = await gore().catch(function(err) {
    console.log(err)
    process.exit(1)
  })

  suite([{
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
        try {
          var title = await runtime.eval(function() {
            return document.title
          })
          var number_of_results = await runtime.eval(function() {
            return document.querySelectorAll('.g').length
          })
        } catch (e) {
          // fail the test if it threw
          console.log('error occured in expression eval', e)
          return false
        }
        return (
          title === 'google - Google Search' &&
          number_of_results === 10
        )
      }
    ]
  }])
})()