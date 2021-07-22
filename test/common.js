const util = require('util')
const { test: originalTest } = require('testra')
const estreval = require('../index')

const { parse, evaluate } = estreval

const inspect = obj => util.inspect(obj, {
  showHidden: false,
  depth: null,
  colors: true
})

const see = (...args) => console.log(...args.map(inspect))

const createRun = it => (code, value, context) => {
  try {

    const result = evaluate(code, context)

    const isCustomPass = value instanceof Function
    const pass = isCustomPass
      ? value(result)
      : it.is(result, value)

    it(code, pass)

    if (!pass && !isCustomPass) {
      console.log('expected', value)
      console.log('actual', result)
    }

  } catch (error) {

    it(code, false)
    console.log('error', inspect(error))
    return
  }
}

const extendedTest = function(title, callback) {

  // Extend test method

  return originalTest(title, it => {

    // Assertion helpers
    Object.assign(it, {
      it, // For convenience with destructuring
      // is, throws
      see,
      run: createRun(it),
      parse,
      evaluate
    })

    return callback(it)
  })
}

global.test = extendedTest // Shortcut to pass to all tests

module.exports = {
  test,
  see
}
