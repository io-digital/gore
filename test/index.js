
'use strict'

var {expect} = require('chai')

var gore = require('..')

describe('gore', function() {
  
  describe('instance', function() {
    
    // shared instance
    var g
    
    it('should set up cleanly', function(done) {
      gore().then(function(gore) {
        g = gore
        expect(gore).have.keys([
          'input', 'page',
          'dom', 'network',
          'suite', 'runtime',
          'kill', 'sleep'
        ])
        done()
      }).catch(done)
    })

    it('should tear down cleanly', function(done) {
      g.kill().then(done.bind(done, null)).catch(done)
    })

  })
})