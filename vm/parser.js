const { Parser } = require('acorn')
const acornJsx = require('acorn-jsx')

const parser = Parser.extend(
  acornJsx()
)

// See https://github.com/acornjs/acorn/tree/master/acorn#interface
const parserOptions = {
  ranges: true,
  locations: true,
  allowReturnOutsideFunction: true,
}

function parse(code, options = {}) {
  return parser.parse(code, {
    ...parserOptions,
    ...options
  })
}

module.exports = {
  parse
}