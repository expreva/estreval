/**
 * Test a reasonable subset of the ECMAScript version 5 language specification.
 * https://tc39.es/ecma262/
 */

const { runTests } = require('testra')
const estreval = require('../index')

require('./common')

test('main export', it => {
  it('exists', estreval)
  it('has parse method', estreval.parse instanceof Function)
})

require('./literals')
require('./types')

require('./object')

require('./function')
require('./class')

require('./general')
require('./sandbox')

runTests()
  .then(() => {
    const current = (new Date).toISOString().slice(0, 19).replace('T', ' ')
    console.log(current)
    console.log()
  })