
# gore

gore is a simple and mostly unfinished chrome headless test runner using a slightly monkey-patched [chrome-remote-interface](https://npmjs.org/package/chrome-remote-interface) as the mechanism for controlling the chrome instance.

the test runner is page navigation oriented, meaning that each test case is made up of discrete steps (just async functions) that interact with the page in some way.

every step in a test case besides the final one is allowed to return `boolean`, `string` and `undefined` values allowing you to pass or fail a test early, navigate to a new page, or declare that navigation occurred manually, respectively. the final step of a test is required to return a `boolean` value to indicate the outcome.

each test case and its constituent steps are executed sequentially.

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
          search_box.form.submit() // submit the form to trigger a page navigation
                                   // which causes the next step to be executed
        })
        // return nothing (undefined) from this step to
        // indicate that page navigation was implicit
      },
      async function() {
        var title = await runtime.eval(function() {
          return document.title
        })
        var number_of_results = await runtime.eval(function() {
          return document.querySelectorAll('.g').length
        })
        return ( // return a boolean to indicate the test outcome
          title === 'kitties - Google Search' &&
          number_of_results === 10
        )
      }
    ]
  }])
})()
```

## todo

* [ ] the test runner will use chrome canary by default if it is installed
* [ ] better/more documentation
* [ ] investigate `SystemInfo` domain
* [ ] add more devtools domains and abstractions
* [ ] add more testing runtime statistics and feedback
* [ ] description strings for test steps
* [ ] tests
* [ ] contribution guidelines
* [ ] write weird test cases to learn and improve the limits of the test runner
* [ ] write examples using more devtools domains
* [ ] [screenshot capture](https://medium.com/@dschnr/using-headless-chrome-as-an-automated-screenshot-tool-4b07dffba79a)
* [ ] test case parallelism using multiple chrome instances/tabs?
* [ ] before/after(all) hooks
* [ ] machine readable output formats

## legal

"Google" and "Google Chrome" are trademarks held by Alphabet Inc. i am in no way affiliated with these companies and/or their projects.