
'use strict'

var {expect} = require('chai')

var gore = require('..')

describe('gore', function() {
  describe('instance', function() {
    it('should set up and tear down cleanly', function(done) {
      gore().then(function(gore) {
        expect(gore).to.have.keys([
          'input', 'page',
          'dom', 'network',
          'suite', 'runtime',
          'kill', 'sleep'
        ])
        return gore.kill()
      }).then(
        done.bind(done, null)
      ).catch(done)
    })
  })
})