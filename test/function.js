var safeEval = require('../')
var test = require('tape')

test('create function', function(t){
  var func = safeEval.Function('arg', 'return arg * 100')
  t.equal(func(5), 500)
  t.end()
})

test('inline functions', function(t){
  t.equal(safeEval('[1, 2, 3, 10, 5].find(x => x == 10)'), 10)
  t.equal(safeEval('[1, 2, 3, 10, 5].find(x => x == 8)'), undefined)
  t.end()
})