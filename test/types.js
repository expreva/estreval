var run = require('../')
var test = require('tape')

test('boolean', function(t){
  run('Boolean.__proto__ = "test"')
  t.notEqual(Boolean.__proto__, 'test')
  t.end()
})

test('new boolean', function(t){
  var result = run('Boolean()')
  t.equal(result, Boolean())
  t.end()
})

test('number', function(t){
  run('Boolean.__proto__ = "test"')
  t.notEqual(Boolean.__proto__, 'test')
  t.end()
})

test('new number', function(t){
  var result = run('Number()')
  t.equal(result, Number())
  t.end()
})

test('string', function(t){
  run('String.__proto__ = "test"')
  t.notEqual(String.__proto__, 'test')
  t.end()
})

test('new string', function(t){
  var result = run('String()')
  t.equal(result, String())
  t.end()
})

test('object', function(t){
  run('Object.__proto__ = "test"')
  t.notEqual(Object.__proto__, 'test')
  t.end()
})

test('new object', function(t){
  var result = run('Object()')
  t.deepEqual(result, Object())
  t.end()
})

test('array', function(t){
  run('Array.__proto__ = "test"')
  t.notEqual(Array.__proto__, 'test')
  t.end()
})

test('new array', function(t){
  var result = run('Array()')
  t.deepEqual(result, Array())
  t.end()
})