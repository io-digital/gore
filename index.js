
var fs = require('fs')
var util = require('util')

var {Launcher} = require('lighthouse/chrome-launcher')
var chrome = require('chrome-remote-interface')

var remote_debug = util.promisify(function(x, cb) {
  chrome(cb.bind(cb, null)).on('error', cb)
})

// TODO fix duplication with `next_test_or_quit` or similar

async function next_test_or_quit(step_index, test_index, suite, failed) {
  step_index = 0
  test_index += 1
  if (test_index >= suite.length) {
    this.rd.Page.loadEventFired()
    // display some test run stats and quit
    console.log('failures', failed)
    return Promise.all([
      this.rd.close(),
      this.launcher.kill()
    ]).then(
      process.exit
    ).catch(
      console.log
    )
  }
  // otherwise, navigate to the next test starting point
  console.log(suite[test_index].description)
  await this.rd.Page.navigate({url: suite[test_index].start_at})
  return
}

function get_export() {
  return {
    tests: async function(suite) {
      // suite struct
      // [
      //   {
      //     description: '',
      //     start_at: '',
      //     steps: [
      //       async function() {
      //         // return string to navigate
      //         // return true to pass
      //         // return false to fail
      //       }
      //     ]
      //   }
      // ]

      var failed = 0
      var test_index = 0
      var step_index = 0

      this.rd.Page.loadEventFired(async function() {

        // if the end of the step set has been reached
        if (step_index >= suite[test_index].steps.length) {
          // await next_test_or_quit.call(this, step_index, test_index, suite, failed)
          // return

          step_index = 0
          test_index += 1
          if (test_index >= suite.length) {
            this.rd.Page.loadEventFired()
            // display some test run stats and quit
            console.log('failures', failed)
            return Promise.all([
              this.rd.close(),
              this.launcher.kill()
            ]).then(
              process.exit
            ).catch(
              console.log
            )
          }
          // otherwise, navigate to the next test starting point
          console.log(suite[test_index].description)
          await this.rd.Page.navigate({url: suite[test_index].start_at})
          return
        }

        try {
          // attempt to run the step
          var result = await suite[test_index].steps[step_index]()
        } catch (e) {
          failed += 1
          // move onto the next set of steps or quit
          // await next_test_or_quit.call(this, step_index, test_index, suite, failed)
          // return
          step_index = 0
          test_index += 1
          if (test_index >= suite.length) {
            this.rd.Page.loadEventFired()
            // display some test run stats and quit
            console.log('failures', failed)
            return Promise.all([
              this.rd.close(),
              this.launcher.kill()
            ]).then(
              process.exit
            ).catch(
              console.log
            )
          }
          // otherwise, navigate to the next test starting point
          console.log(suite[test_index].description)
          await this.rd.Page.navigate({url: suite[test_index].start_at})
          return
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
        // await next_test_or_quit.call(this, step_index, test_index, suite, failed)
        // return
        step_index = 0
        test_index += 1
        if (test_index >= suite.length) {
          this.rd.Page.loadEventFired()
          // display some test run stats and quit
          console.log('failures', failed)
          return Promise.all([
            this.rd.close(),
            this.launcher.kill()
          ]).then(
            process.exit
          ).catch(
            console.log
          )
        }
        // otherwise, navigate to the next test starting point
        console.log(suite[test_index].description)
        await this.rd.Page.navigate({url: suite[test_index].start_at})
        return
      }.bind(this))

      // start the test suite with the first navigation
      try {
        console.log(suite[test_index].description)
        await this.rd.Page.navigate({url: suite[test_index].start_at})
      } catch (e) {
        failed += 1
        // await next_test_or_quit.call(this, step_index, test_index, suite, failed)
        // return
        step_index = 0
        test_index += 1
        if (test_index >= suite.length) {
          this.rd.Page.loadEventFired()
          // display some test run stats and quit
          console.log('failures', failed)
          return Promise.all([
            this.rd.close(),
            this.launcher.kill()
          ]).then(
            process.exit
          ).catch(
            console.log
          )
        }
        // otherwise, navigate to the next test starting point
        console.log(suite[test_index].description)
        await this.rd.Page.navigate({url: suite[test_index].start_at})
        return
      }
    }.bind(this),
    page: this.rd.Page,
    dom: this.rd.DOM,
    network: this.rd.Network,
    runtime: this.rd.Runtime,
    input: this.rd.Input,
    kill: function() {
      return Promise.all([
        this.rd.close(),
        this.launcher.kill()
      ]).catch(console.log)
    }.bind(this)
  }
}

var instance = {}

module.exports = async function(options = {}) {
  
  if (instance.launcher && instance.rd) {
    return get_export.call(instance)
  }
  
  instance.launcher = new Launcher({
    port: 9222,
    chromeFlags: [
      `--window-size=${options.width || 1024},${options.height || 768}`,
      '--disable-gpu',
      '--headless'
    ]
  })

  try {
    instance.rd = (await (
      instance.launcher.launch()
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
    instance.launcher.kill().catch(console.log)
    console.log(e)
    throw new Error('unable to initialise remote debug context')
  }

  if (options.system) {
    try {
      await instance.rd.SystemInfo.getInfo().catch(
        console.log
      )
    } catch (e) {
      console.log(e)
    }
  }

  if (options.console) {
    instance.rd.Log.entryAdded(console.log)
  }

  return get_export.call(instance)
}