

test('sandbox', ({ it, evaluate, is,  run }) => {

  let original, code, result

  // Global

  it('this is not global', evaluate('this')!==global)

  it('global is undefined and throws', it.throws(() => {
    evaluate('global')
  }))

  // Prototype and __proto__

  const x = ['test']

  original = Object.getPrototypeOf(x)
  code = 'x.__proto__ = { newProto: true }'

  evaluate(code, { x: original })

  it('__proto__ not changed', original===Object.getPrototypeOf(x))
  it('__proto__.newProto not changed', original.newProto===undefined)

  // String

  it('throw if attempt to modify prototype of String', it.throws(() => {
    evaluate(`String.prototype.makeLouder = function() { return this + "!" }; "test".makeLouder()`)
  }))

  it('String prototype untouched', String.prototype.makeLouder===undefined)

  // Array

  original = Array.prototype.map

  it('throw if attempt to modify prototype of Array', it.throws(() => {
    evaluate(`Array.prototype.map = function() { return "hi" }`)
  }))

  it('Array prototype untouched', Array.prototype.map===original)

  // Object

  it('throw if attempt to modify prototype of Object', it.throws(() => {
    evaluate(`Object.prototype.wibblify = function() { return "~" + this.value + "~" }; ({value: "test"}).wibblify()`)
  }))

  it('Object prototype untouched', Object.prototype.wibblify===undefined)

  it('throw if attempt to modify __proto__ of Object', it.throws(() => {
    evaluate(`({}).__proto__.wibblify = function() { return "~" + this.value + "~" }; ({value: "test"}).wibblify()`)
  }))

  it('Object prototype untouched', Object.prototype.wibblify===undefined)


  // Constructor - Try to access this via constructor

  run(`[].slice.constructor('return this')()`, undefined)
  run(`[].slice.constructor.bind()('return this')()`, undefined)

  // Function

  result = undefined

  it('cannot modify prototype of Function', it.throws(() => {

    result = evaluate(`
function fn() {};
var constructorProperty = Object.getOwnPropertyDescriptors(fn.__proto__).constructor;
var properties = Object.values(constructorProperty);
properties.pop();
properties.pop();
properties.pop();
var Function = properties.pop();
(Function('return this'))()
`)

  }))

  it('prevent access to this/global from Function', result!==global)
  it('this is undefined from new Function', result===undefined)


  result = undefined

  it('cannot modify prototype of Function (bound)', it.throws(() => {

    result = evaluate(`
function fn() {};
var constructorProperty = Object.getOwnPropertyDescriptors(fn.__proto__).constructor;
var properties = Object.values(constructorProperty);
properties.pop();
properties.pop();
properties.pop();
var Func = properties.map(function (x) {return x.bind(x, 'return this')}).pop();
(Func())()
`)
  }))

  it('prevent access to this/global from Function (bound)', result!==global)
  it('this is undefined from new Function (bound)', result===undefined)

  try {
    evaluate(`try{a[b];}catch(e){e.constructor.constructor('return __proto__.arguments.callee.__proto__.polluted=true')()};`)
  } catch(e) {
    // @eslint-ignore no-empty
  }

  it('prevent access to Function prototype', Function.polluted===undefined)

  // Infinite recursion

  it('infinite recursion', it.throws(() => {
    evaluate('function test() { test() }; test()')
  }))

  it('infinite for loop', it.throws(() => {
    evaluate('for (;true;){}')
  }))

  it('infinite while loop', it.throws(() => {
    evaluate('while (true){}')
  }))

})
