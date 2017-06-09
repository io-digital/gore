
'use strict'

var util = require('util')

var {Launcher} = require('lighthouse/chrome-launcher')
var chrome = require('chrome-remote-interface')

var remote_debug = util.promisify(function(x, cb) {
  chrome(cb.bind(cb, null)).on('error', cb)
})

async function next_test_or_quit(test_index, suite, failed, passed) {
  // if there are no more tests to run
  if (test_index >= suite.length) {
    // report failures
    failed.forEach(function(failure) {
      console.log('[gore]', 'failure:', failure)
    })
    // report successes
    passed.forEach(function(pass) {
      console.log('[gore]', 'passed:', pass)
    })
    // shut down chrome, remote debug interface and node
    var exit = process.exit.bind(process, failed.length ? 1 : 0)
    return Promise.all([
      this.rd.close(),
      this.launcher.kill()
    ]).catch(function(err) {
      console.log(err)
      exit()
    }).then(exit)
  }
  // otherwise, navigate to the next test starting point
  console.log('[gore]', 'starting:', suite[test_index].description)
  try {
    await this.rd.Page.navigate({url: suite[test_index].start_at})
  } catch (e) {
    failed.push(`test ${test_index + 1} step 1 failed with navigation error ${e}`)
    return (await next_test_or_quit.call(this, ++test_index, suite, failed, passed))
  }
  return 0
}

function validate_suite(suite) {
  console.log('[gore]', 'starting:', 'test suite type check')
  var tests = []
  if (!(Array.isArray(suite) && suite.length)) {
    throw new Error('expected lengthy array `suite`')
  }
  for (var test in suite) {
    if (!(typeof suite[test].start_at === 'string' &&
          suite[test].start_at.length)) {
      throw new Error('expected lengthy string `start_at`')
    }
    suite[test].description = suite[test].description || `test ${+test + 1}`
    if (!(Array.isArray(suite[test].steps) && suite[test].steps.length)) {
      throw new Error('expected lengthy array `steps`')
    }
    for (var func in suite[test].steps) {
      if (!(typeof suite[test].steps[func] === 'function')) {
        throw new Error('expected function in `steps` array')
      }
    }
  }
  console.log('[gore]', 'passed:', 'test suite type check')
}

function get_export() {
  return {
    input: this.rd.Input,
    page: this.rd.Page,
    dom: this.rd.DOM,
    network: this.rd.Network,
    suite: async function(suite) {
      
      // first ensure the test suite is usable
      validate_suite(suite)

      // accumulate user output
      var failed = []
      var passed = []
      
      // set up control variables
      var test_index = -1
      var step_index = 0

      // bind the page load event
      this.rd.Page.loadEventFired(async function() {
        var threw = false
        try {
          // attempt to run the step
          var result = await suite[test_index].steps[step_index]()
        } catch (e) {
          failed.push(`test ${test_index + 1} step ${step_index + 1} failed with an error: \n  ${e.stack}`)
          threw = true
        }
        
        var result_type = typeof result
        if (threw) {
          // the test threw, wait for the next test case to begin...
        } else if (result_type === 'undefined' || result === null) {
          if (step_index === suite[test_index].steps.length - 1) {
            // the test case is faulty
            failed.push(`test ${test_index + 1} step ${step_index + 1} failed to yield a boolean result`)
            step_index = await next_test_or_quit.call(this, ++test_index, suite, failed, passed)
            return
          }
          step_index += 1
          return // return to wait for the next page load event
                 // because the test case is not finished yet
        } else if (result_type === 'string') {
          try {
            step_index += 1
            await this.rd.Page.navigate({url: result})
            return // return to wait for the next page load event
                   // because the test case is not finished yet
          } catch (e) {
            failed.push(`test ${test_index + 1} step ${step_index + 1} failed with navigation error: \n  ${e} "${result}"`)
            step_index = await next_test_or_quit.call(this, ++test_index, suite, failed, passed)
            return
          }
        } else if (result_type === 'boolean' && !result) {
          failed.push(`test ${test_index + 1} step ${step_index + 1} failed with boolean false`)
        } else if (result_type === 'boolean' && result) {
          // the test passed, do nothing...
          passed.push(suite[test_index].description)
        } else {
          failed.push(`test ${test_index + 1} step ${step_index + 1} failed with unexpected type: ${result_type}`)
        }
        step_index = await next_test_or_quit.call(this, ++test_index, suite, failed, passed)
      }.bind(this))

      // navigate to the first test case
      await next_test_or_quit.call(this, ++test_index, suite, failed, passed)
    }.bind(this),
    runtime: Object.assign(this.rd.Runtime, {
      eval: async function(expression) {
        var res = await this.rd.Runtime.evaluate({
          expression: `(function() {return new Promise(function(resolve, reject) {try {resolve((${expression.toString()})())} catch (e) {reject(e)}})})()`,
          awaitPromise: true
        })
        if (res.exceptionDetails) {
          // the input expression threw
          var err = new (global[res.exceptionDetails.exception.className] || Error)()
          err.stack = res.exceptionDetails.exception.description
          throw err
        }
        return res.result.value
      }.bind(this)
    }),
    kill: function() {
      return Promise.all([
        this.rd.close(),
        this.launcher.kill()
      ]).catch(console.log)
    }.bind(this)
  }
}

var gore = {}

module.exports = async function(options = {}) {
  
  if (gore.launcher && gore.rd) return get_export.call(gore)
  
  gore.launcher = new Launcher({
    port: 9222,
    chromeFlags: [
      `--window-size=${options.width || 1024},${options.height || 768}`,
      '--disable-gpu',
      '--headless'
    ]
  })

  try {
    gore.rd = (await (
      gore.launcher.launch()
    ).then(
      remote_debug
    ).then(function(rd) {
      return Promise.all([
        rd,
        rd.Page.enable(),
        rd.DOM.enable(),
        rd.Network.enable(),
        rd.Runtime.enable(),
        rd.Log.enable()
      ])
    })).shift()
  } catch (e) {
    gore.launcher.kill().catch(console.log)
    console.log(e)
    throw new Error('unable to initialise remote debug context')
  }

  if (options.system) {
    try {
      // this throws for some reason
      await gore.rd.SystemInfo.getInfo().then(console.log)
    } catch (e) {
      console.log(e)
    }
  }

  if (options.console) gore.rd.Log.entryAdded(console.log)

  return get_export.call(gore)
}