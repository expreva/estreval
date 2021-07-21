const vm = require('./vm')
const { Interpreter } = require('./vm/interpreter')
const {
  parse,
  evaluate,
  createFunction
} = vm

Object.assign(evaluate, {
  Interpreter,
  vm,
  parse,
  evaluate,
  createFunction
})

module.exports = evaluate