const { Parser } = require('acorn')

const acornJsx = require('acorn-jsx')
const buildJsx = require('../lib/estree-util-build-jsx')

const defaultOptions = require('./defaultOptions')

const parser = Parser.extend(
  acornJsx()
)

function parse(code, options = {}) {

  const tree = parser.parse(code, {
    ...defaultOptions,
    ...options
  })

  buildJsx(tree)

  return tree
}

module.exports = parse