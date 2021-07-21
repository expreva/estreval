var run = require('../')
var test = require('tape')

test('this and global', function(t){
  t.notEqual(run('this'), global, 'this is not global')
  t.throws(function() {
    run('global') // Error: global is not defined
  })
  t.end()
})

test('attempt override prototype method', function(t){
  var original = Array.prototype.map
  var code = 'Array.prototype.map = function(){ return "HACK" }'
  t.throws(function(){
    run(code, {
      Array: Array
    })
  }, 'original array prototype untouched')
  t.equal(Array.prototype.map, original, 'prototype method not changed')
  t.end()
})

test('attempt to set __proto__', function(t){
  var x = ['test']
  var original = Object.getPrototypeOf(x)
  run('x.__proto__ = {newProto: true}', {
    x: original
  })
  t.equal(Object.getPrototypeOf(x), original, '__proto__ not changed')
  t.equal(original.newProto, undefined, '__proto__.newProto property not changed')
  t.end()
})

test('try to access this via constructor', function(t){
  var result = run("[].slice.constructor('return this')()")
  t.equal(result, undefined)
  t.end()
})

test('try to access this via constructor and bind', function(t){
  var result = run("[].slice.constructor.bind()('return this')()")
  t.equal(result, undefined)
  t.end()
})

test('infinite recursion', function(t){
  t.throws(function(){
    run('function test() { test() }; test()')
  })
  t.end()
})

test('infinite for loop', function(t){
  t.throws(function(){
    run('for (;true;){}')
  })
  t.end()
})

test('infinite while loop', function(t){
  t.throws(function(){
    run('while (true){}')
  })
  t.end()
})

test('set wrapped string prototype', function(t){
  var code = 'String.prototype.makeLouder = function() { return this + "!" }; "test".makeLouder()'
  t.throws(function(){
    run(code)
  }, 'original string prototype untouched')
  t.end()
})

test('set wrapped object prototype', function(t){
  var code = 'Object.prototype.wibblify = function() { return "~" + this.value + "~" }; ({value: "test"}).wibblify()'
  t.throws(function(){
    run(code)
  }, 'original object prototype untouched')
  t.end()
})

test('set wrapped object prototype by object.__proto__', function(t){
  var code = '({}).__proto__.wibblify = function() { return "~" + this.value + "~" }; ({value: "test"}).wibblify()'
  t.throws(function(){
    ({ value: "test" }).wibblify()
  }, 'original object prototype untouched')
  t.end()
})

test('prevent access to Function via function call', function(t){
  var code = "" +
    "function fn() {};" +
    "var constructorProperty = Object.getOwnPropertyDescriptors(fn.__proto__).constructor;" +
    "var properties = Object.values(constructorProperty);" +
    "properties.pop();" +
    "properties.pop();" +
    "properties.pop();" +
    "var Function = properties.pop();" +
    "(Function('return this'))()"
  t.notEqual(run(code), global)
  t.equal(run(code), undefined)
  t.end()
})

test('prevent access to Function via function call (bound)', function(t){
  var code = "" +
    "function fn() {};" +
    "var constructorProperty = Object.getOwnPropertyDescriptors(fn.__proto__).constructor;" +
    "var properties = Object.values(constructorProperty);" +
    "properties.pop();" +
    "properties.pop();" +
    "properties.pop();" +
    "var Func = properties.map(function (x) {return x.bind(x, 'return this')}).pop();" +
    "(Func())()"
  t.notEqual(run(code), global)
  t.equal(run(code), undefined)
  t.end()
})

test('prevent access to Function prototype', function(t){
  try {
    run("try{a[b];}catch(e){e.constructor.constructor('return __proto__.arguments.callee.__proto__.polluted=true')()};")
  } catch(e) {
    // @eslint-ignore no-empty
  }
  t.equal(Function.polluted, undefined)
  t.end()
})
