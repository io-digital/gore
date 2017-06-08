
# gore

gore is a simple and mostly unfinished chrome headless test runner using a slightly monkey-patched [chrome-remote-interface](https://npmjs.org/chrome-remote-interface) as the mechanism for performing webapp tests.

the test runner is page navigation oriented, meaning that individual tests are split into steps (just async functions) that trigger some kind of page navigation and ultimately a boolean value indicating the outcome of your test case. each test case and its consituent steps are executed sequentially.

## example

```javascript
(async function() {
  var gore = require('gore')
  var {suite, runtime} = await gore()
  suite([{
    description: 'run a google search',
    start_at: 'http://google.com',
    steps: [
      async function() {
        await runtime.eval(function() {
          var search_box = document.querySelector('#lst-ib')
          search_box.value = 'kitties'
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
```

## todo

* [ ] better/more documentation
* [ ] investigate `SystemInfo` domain
* [ ] add more devtools domains and abstractions
* [ ] fix duplication with `next_test_or_quit` or similar
* [ ] add more testing runtime statistics and feedback
* [ ] description strings for test steps
* [ ] tests
* [ ] contribution guidelines
* [ ] refactor test runner so `runtime.eval`s that throw will automatically fail a test

## legal

"Google" and "Google Chrome" are trademarks held by Alphabet Inc. i am in no way affiliated with these companies and/or their projects.