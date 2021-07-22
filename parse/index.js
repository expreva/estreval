const parser = require('acorn')
const defaultOptions = require('./defaultOptions')

function parse(code, options = {}) {
  return parser.parse(code, {
    ...defaultOptions,
    ...options
  })
}

module.exports = parse