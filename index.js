const parse = require('./parse/jsx')
const evaluate = require('./evaluate')

function estreval(code, context = {}, options = {}) {
  if (!options.parse) options.parse = parse
  return evaluate(code, context, options)
}

Object.assign(estreval, {
  parse,
  evaluate: estreval
})

module.exports = estreval