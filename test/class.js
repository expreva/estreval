var run = require('../')
var test = require('tape')

test('create class', function(t){
  const C = run('class C { x = 3; constructor() { this.y = 5 } add() { this.z = 7 } }')
  t.notEqual(C, undefined)
  let instance
  t.doesNotThrow(function() {
    instance = new C
  })
  t.notEqual(instance, undefined)
  t.equal(instance.x, 3)
  t.equal(instance.y, 5)
  t.doesNotThrow(function() {
    instance.add()
  })
  t.equal(instance.z, 7)
  t.end()
})
