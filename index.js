const createVirtualMachine = require('./vm')
const parse = require('./parse/jsx')

const estreval = createVirtualMachine({
  parse
})

module.exports = estreval