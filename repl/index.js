const path = require('path')
const util = require('util')
const os = require('os')
const fs = require('fs')

// https://nodejs.org/api/repl.html
const repl = require('repl')


const homedir = os.homedir()

let estreval = require('../index')

function inspect(arg) {
  return util.inspect(arg, {
    colors: true,
    depth: null
  })
}

function isRecoverableError(error) {
  if (error.name === 'SyntaxError') {
    return /^(Unexpected end of input|Unexpected token)/.test(error.message)
  }
  return false
}

async function replEval(code, context, filename, callback) {

  try {

    let result = await estreval(code, context) // vm.runInNewContext(code, context)

    callback(null, result)

  } catch (e) {

    /**
     * Recoverable error
     *
     * Possible to support multi-line input; however, it cannot distinguish
     * syntax error from parse().
     *
     * See: https://nodejs.org/api/repl.html#repl_recoverable_errors
     */
    // if (isRecoverableError(e)) {
    //   callback(new repl.Recoverable(e))
    //   return
    // }

    console.log(`${ e.name && e.name!=='Error' ? e.name+': ' : '' }${e.message}`)
    callback(null)
  }
}

// Create REPL instance

const replServer = repl.start({
  prompt: '> ',
  eval: replEval,
  ignoreUndefined: true,
})

// Context

const context = {
  parse: src => console.log(inspect( estreval.parse(src) )),
  require: (src = '') => {

    const srcPath = src[0]==='.'
      ? path.resolve(src)
      : src[0]==='~'
        ? src.replace(/^~/, homedir)
        : src

    if (srcPath[0]!=='/') {
      return require(srcPath)
    }

    if ( ! fs.existsSync(srcPath) ) {
      throw new Error(`File not found ${src}`)
    }

    const code = fs.readFileSync(srcPath, 'utf8')

    replServer.context.module.exports = {}

    let result = estreval(code, replServer.context)

    return replServer.context.module.exports

    // replEval(code, replServer.context, srcPath, (error, result) => {
    //   error ? console.error('Error', error) : console.log(result)
    // })
  },
  print: (...args) => console.log( ...args.map(inspect) )
}

Object.assign(replServer.context,
  context
)

// Provide command .reload to reload the eval library

replServer.defineCommand('reload', {
  help: 'Reload the eval library',
  action(name) {
    this.clearBufferedCommand()

    /**
     * Clear require cache
     *
     * Was: delete require.cache[ require.resolve('./index') ]
     * Must remove all keys to clear all required files.
     */
    Object.keys(require.cache).forEach(key => delete require.cache[key])

    estreval = require('../index')

    this.displayPrompt()
  }
})
