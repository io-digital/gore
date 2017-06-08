
'use strict'

var util = require('util')

var {Launcher} = require('lighthouse/chrome-launcher')
var chrome = require('chrome-remote-interface')

var remote_debug = util.promisify(function(x, cb) {
  chrome(cb.bind(cb, null)).on('error', cb)
})

async function next_test_or_quit(test_index, suite, failed) {
  if (test_index >= suite.length) {
    this.rd.Page.loadEventFired()
    // display some test run stats and quit
    console.log('failures', failed)
    var exit = process.exit.bind(process, failed ? 1 : 0)
    return Promise.all([
      this.rd.close(),
      this.launcher.kill()
    ]).catch(function(err) {
      console.log(err)
      exit()
    }).then(exit)
  }
  // otherwise, navigate to the next test starting point
  console.log(suite[test_index].description)
  await this.rd.Page.navigate({url: suite[test_index].start_at})
  return
}

function get_export() {
  return {
    suite: async function(suite) {
      var failed = 0
      var test_index = 0
      var step_index = 0

      this.rd.Page.loadEventFired(async function() {

        // if the end of the step set has been reached
        if (step_index >= suite[test_index].steps.length) {
          step_index = 0
          test_index += 1
          return next_test_or_quit.call(this, test_index, suite, failed)
        }

        try {
          // attempt to run the step
          var result = await suite[test_index].steps[step_index]()
        } catch (e) {
          failed += 1
          // move onto the next set of steps or quit
          step_index = 0
          test_index += 1
          return next_test_or_quit.call(this, test_index, suite, failed)
        }
        
        var result_type = typeof result
        if (result_type === 'undefined' || result_type === 'string') {
          step_index += 1
          if (result_type === 'string') {
            await this.rd.Page.navigate({url: result})
          }
          return
        } else if (result_type === 'boolean' && !result) {
          failed += 1
        } else if (result_type === 'boolean' && result) {
          // the test passed, do nothing...
        } else {
          failed += 1
        }
        
        step_index = 0
        test_index += 1
        return next_test_or_quit.call(this, test_index, suite, failed)
      }.bind(this))

      // start the test suite with the first navigation
      try {
        console.log(suite[test_index].description)
        await this.rd.Page.navigate({url: suite[test_index].start_at})
      } catch (e) {
        failed += 1
        
        step_index = 0
        test_index += 1
        return next_test_or_quit.call(this, test_index, suite, failed)
      }
    }.bind(this),
    page: this.rd.Page,
    dom: this.rd.DOM,
    network: this.rd.Network,
    runtime: Object.assign(this.rd.Runtime, {
      eval: async function(expression) {
        var res = await this.rd.Runtime.evaluate({
          expression: `(function() {return new Promise(function(resolve, reject) {try {resolve((${expression.toString()})())} catch (e) {reject(e)}})})()`,
          awaitPromise: true
        })
        if (res.exceptionDetails) {
          // the input expression threw
          throw new Error(JSON.stringify(res.exceptionDetails.exception, '\t', 2))
        }
        return res.result.value
      }.bind(this)
    }),
    input: this.rd.Input,
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