
var fs = require('fs')
var util = require('util')

var {Launcher} = require('lighthouse/chrome-launcher')
var chrome = require('chrome-remote-interface')

var remote_debug = util.promisify(function(x, cb) {
  chrome(cb.bind(cb, null)).on('error', cb)
})

module.exports = async function(options = {}) {
  var launcher = new Launcher({
    port: 9222,
    chromeFlags: [
      `--window-size=${options.width || 1024},${options.height || 768}`,
      '--disable-gpu',
      '--headless'
    ]
  })

  var rd = (await (
    launcher.launch()
  ).then(
    remote_debug
  ).then(function(rd) {
    return Promise.all([
      rd,
      rd.Page.enable(),
      rd.DOM.enable(),
      rd.Network.enable(),
      rd.Runtime.enable()
    ])
  }).catch(function(err) {
    launcher.kill().catch(console.log)
    console.log('chrome launch error', err)
    process.exit(1)
  })).shift()

  return Promise.resolve({
    test: async function(description, user_test) {
      console.log(description)
      try {
        await user_test(rd.Page, rd.DOM, rd.Network, rd.Runtime)
      } catch (e) {
        console.log('test error', e)
        // throw new Error(e)
      }
    },
    page: rd.Page,
    dom: rd.DOM,
    network: rd.Network,
    runtime: rd.Runtime,
    kill: function() {
      return Promise.all([
        rd.close(),
        launcher.kill()
      ]).catch(console.log)
    }
  })
}