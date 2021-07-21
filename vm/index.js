const { parse: defaultParse } = require('./parser')
const { Interpreter } = require('./interpreter')

function createContext(context = Object.create(null)) {
  return context
}

let interpreter

function getInterpreter(context = {}, options = {}) {

  if (!options.parse) options.parse = defaultParse

  if (!interpreter) {
    interpreter = new Interpreter(context, options)
  } else {
    interpreter.reset(context, options)
  }

  return interpreter
}

function compileFunction(code, params = [], options = {}) {

  const context = options.parsingContext
  const timeout = options.timeout === undefined ? 0 : options.timeout
  const wrapCode = `
    (function anonymous(${params.join(',')}){
         ${code}
    });
    `
  const interpreter = getInterpreter(context, options)

  return interpreter.evaluate(wrapCode)
}

function runInContext(code, context, options) {

  const interpreter = getInterpreter(context, options)

  return interpreter.evaluate(code)
}

const runInNewContext = runInContext

function createFunction(...args) {
  const code = args.pop()
  return compileFunction(code || '', args)
}

function evaluate(code, context = {}, options = {}) {
  return runInContext(code, context, options)
}

class Script {
  constructor(code, options = {}) {
    this._code = code
    this._options = options
  }
  runInContext(context) {
    return runInContext(this._code, context, this._options)
  }
  runInNewContext(context) {
    return runInContext(this._code, context, this._options)
  }
}

module.exports = {
  createContext,
  compileFunction,
  runInContext,
  runInNewContext,
  createFunction,
  parse: defaultParse,
  evaluate,
  Script
}