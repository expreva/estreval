notevil
===

Evalulate javascript like the built-in javascript `eval()` method but **safely**. 

This module uses [esprima](https://github.com/ariya/esprima) to parse the javascript AST then walks each node and evaluates the result. 

Like built-in `eval`, the result of the last expression will be returned. Unlike built-in, there is no access to global objects, only the context that is passed in as the second object.

[![NPM](https://nodei.co/npm/notevil.png?compact=true)](https://nodei.co/npm/notevil/)

## Example

```js
var safeEval = require('notevil')

// basic math
var result = safeEval('1+2+3')
console.log(result) // 6

// context and functions
var result = safeEval('1+f(2,3)+x', {
  x: 100, 
  f: function(a,b){
    return a*b
  }
})
console.log(result) // 107

// multiple statements, variables and if statements
var result = safeEval('var x = 100, y = 200; if (x > y) { "cats" } else { "dogs" }')
console.log(result) // dogs

// inner functions
var result = safeEval('[1,2,3,4].map(function(item){ return item*100 })')
console.log(result) // [100, 200, 300, 400]
```

### Updating context from safeEval

```js
var context = { x: 1, obj: {y: 2} }

// update context global
safeEval('x = 300', context)
console.log(context.x) // 300

// update property on object
safeEval('obj.y = 300', context)
console.log(context.obj.y) // 300
```

### Creating functions
```js
var func = safeEval.Function('param', 'return param * 100')
var result = func(2)
console.log(result) // 200
```
