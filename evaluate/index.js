const { Interpreter } = require('./interpreter')

let interpreter

function evaluate(node, context, options = {}) {

  if (!interpreter) {
    interpreter = new Interpreter(context, options)
  } else {
    interpreter.reset(context, options)
  }

  return interpreter.evaluate(node)
}

module.exports = evaluate