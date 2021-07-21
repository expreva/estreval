const { Interpreter } = require('./interpreter')

let interpreter

function evaluate(node, context, options = {}) {

  if (!options.parse) options.parse = function() {
    throw new Error('Parse is unsupported')
  }

  if (!interpreter) {
    interpreter = new Interpreter(context, options)
  } else {
    interpreter.reset(context, options)
  }

  return interpreter.evaluate(node)
}

module.exports = evaluate