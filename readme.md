# Estreval

Evaluate JavaScript abstract syntax tree in [ESTree](https://github.com/estree/estree) format


## Parse and evaluate

Parse and evaluate - the default parser is [Acorn](https://github.com/acornjs/acorn).

```js
const estreval = require('estreval')

const context = {
  x: 3
}

estreval('y => x * y', context)(5) // 15
```


## Custom parser

To use a custom parser, import the evaluate function separately.

The following example uses [Esprima](https://github.com/jquery/esprima).

```js
const evaluate = require('estreval/evaluate')
const { parseScript } = require('esprima')

const tree = parseScript('y => x * y')

evaluate(tree, { x: 3 })(5) // 15
```

The parse function can be passed as the `parse` property in the optional third argument `options`.  It will be used when new instances of `Function` are created inside the runtime. Otherwise, `Function` will be undefined.

```
evaluate(tree, context, { parse })
```


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

- [x] Class
- ? Async / await

## References

- [eval5](https://github.com/bplok20010/eval5)
- [estime](https://github.com/IAIAE/estime)

- [notevil](https://github.com/mmckegg/notevil) and its forks

- [evaljs](https://github.com/marten-de-vries/evaljs)
- [closure-interpreter](https://github.com/int3/closure-interpreter)

- https://www.npmjs.com/package/esper.js
- https://www.npmjs.com/package/sandboxr
- https://github.com/NeilFraser/JS-Interpreter
- https://github.com/mozilla/narcissus/

