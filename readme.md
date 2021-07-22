# Estreval

Evaluate JavaScript abstract syntax tree in [ESTree](https://github.com/estree/estree) format


## Evaluate

The main function evaluates an expression.

```js
const estreval = require('estreval')

estreval('1 + 2 * 3') // 7
```

Optionally pass the global context of variables to which the code will have access.

```js
const estreval = require('estreval')

const context = { x: 3 }

estreval('y => x * y', context)(5) // 15
```

## Options

The main function's third argument is an `options` object (optional).

```js
estreval(code, context, options)
```

It can have the following properties.

- `timeout` - Maximum amount of time (in milliseconds) allowed for the code - Default: 100
- `maxSteps` - Maximum number of steps allowed for the code - Default: 1024

## Default parser

The default parser uses [Acorn](https://github.com/acornjs/acorn).

It can be imported by itself.

```js
const parse = require('estreval/parse')

const tree = parse('y => x * y') // ESTree format
```

## Evaluate with custom parser

To use a custom parser, import the evaluate function separately.

The following example uses [Esprima](https://github.com/jquery/esprima).

```js
const evaluate = require('estreval/evaluate')
const { parseScript: parse } = require('esprima')

const tree = parse('y => x * y')
const context = { x: 3 }
const options = { parse }

evaluate(tree, context, options)(5) // 15
```

The parse function can be passed as the `parse` property in the optional third argument `options`.  It will be used when new instances of `Function` are created inside the runtime. Otherwise, the use of `Function` will throw an error.

## Develop

Build unminified for development, watch files for changes, and start server for test page

```
npm run dev
```

Build minified for production

```
npm run build
```


## REPL

Start a [read-eval-print loop](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop) to interact with the runtime.

```
node repl
```

The following functions are provided for convenience:

- `print( any )` - Show value using `inspect` and `console.log`
- `parse( string )` - Parse given string and print abstract syntax tree

#### Reload

Enter `.reload` in the REPL to reload the library after editing its files.


## Roadmap

Beyond ES5

- [x] Array function expression
- [x] Block scope and let and const
- [x] Spread and rest operators
- [x] Class
- [x] Promise
- [ ] Async / await - Maybe not.. This would require event loop.

## References

- [eval5](https://github.com/bplok20010/eval5)
- [estime](https://github.com/IAIAE/estime)
- [notevil](https://github.com/mmckegg/notevil) and its forks
- [evaljs](https://github.com/marten-de-vries/evaljs)
- [closure-interpreter](https://github.com/int3/closure-interpreter)
- [esper.js](https://github.com/codecombat/esper.js)
- [sandboxr](https://github.com/jrsearles/SandBoxr)
- [JS-Interpreter](https://github.com/NeilFraser/JS-Interpreter)
- [narcissus](https://github.com/mozilla/narcissus/)
