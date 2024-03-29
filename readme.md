# Estreval

Evaluate JavaScript abstract syntax tree in [ESTree](https://github.com/estree/estree) format


## Overview

This is a sandboxed runtime to evaluate JavaScript expressions.

Here is [an example page](https://expreva.github.io/estreval/) to interact with it.


#### Language

The interpreter supports a reasonable subset of ES5, the 5th Edition of the ECMAScript language specification ([PDF](https://www.ecma-international.org/wp-content/uploads/ECMA-262_5th_edition_december_2009.pdf)). In addition, some modern syntax is supported:

- Array function expression
- Block scope, let and const
- Class
- JSX - No React or renderer yet
- Spread and rest expression

Notably missing are `Promise` and async/await, because there is no event loop.


## Evaluate

The main function parses and evaluates an expression.

```js
const estreval = require('estreval')

estreval('1 + 2 * 3') // 7
```

The expression can be given as string, or an object in ESTree format.

## Context

The second argument is a `context` object (optional). It defines the global context of variables to which the code will have access.

```js
const context = { x: 3 }

estreval('y => x * y', context)(5) // 15
```

## Options

The third argument is an `options` object (optional).

```js
estreval(code, context, options)
```

It can have the following properties.

- `timeout` - Maximum amount of time (in milliseconds) allowed for the code - Default: `100`
- `maxSteps` - Maximum number of steps allowed for the code - Default: `1024`

## Default parser

The default parser uses [Acorn](https://github.com/acornjs/acorn).

It can be imported by itself.

```js
const parse = require('estreval/parse')

const tree = parse('y => x * y') // ESTree format
```

## Custom parser

To use a custom parser, first import the evaluate function separately.

The following example uses [Esprima](https://github.com/jquery/esprima).

```js
const evaluate = require('estreval/evaluate')
const { parseScript: parse } = require('esprima')

const tree = parse('y => x * y')
const context = { x: 3 }
const options = { parse }

evaluate(tree, context, options)(5) // 15
```

The parse function can be passed as the `parse` option.  It will be used when new instances of `Function` are created inside the runtime. Otherwise, the use of `Function` will throw an error.

#### Babel parser

To use the [Babel parser](https://github.com/babel/babel/tree/main/packages/babel-parser), specify its built-in plugin `estree` to convert the syntax tree to ESTree format.

```js
const { parse } = require('@babel/parser')

const tree = parse(code, {
  plugins: ['estree']
})
```

This is necessary because Babel uses [its own AST format](https://babeljs.io/docs/en/babel-parser.html#output), with some differences from the ESTree specification.


## REPL

Start a [read-eval-print loop](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop) to interact with the runtime in the terminal.

```
node repl
```

The following functions are provided for convenience.

- `print( any )` - Show value using `inspect` and `console.log`
- `parse( string )` - Parse given string and print abstract syntax tree

#### Reload

Enter `.reload` in the REPL to reload the library after editing its files.


## Develop the library

Build unminified for development, watch files for changes, and start server for test page

```
npm run dev
```

Build minified for production

```
npm run build
```


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
