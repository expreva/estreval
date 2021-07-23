const parse = require('./parse/jsx')
const { Interpreter } = require('./evaluate/interpreter')

let interpreter = new Interpreter(false)

function estreval(code, context = {}, options = {}) {

  if (!options.parse) options.parse = parse

  interpreter.reset(context, options)

  return interpreter.evaluate(code)
}

Object.assign(estreval, {
  interpreter,
  parse,
  evaluate: estreval
})

module.exports = estreval