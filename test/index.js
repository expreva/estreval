const { test, runTests } = require('testra')
const estreval = require('../index')

global.test = test

test('estreval', it => {
  it('exists', estreval)
})

runTests()