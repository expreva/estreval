const vm = require('./vm')
const { Interpreter } = require('./vm/interpreter')
const {
  parse,
  evaluate,
  createFunction
} = vm

const estreval = evaluate

Object.assign(estreval, {
  Interpreter,
  vm,
  parse,
  evaluate,
  createFunction
})

module.exports = estreval