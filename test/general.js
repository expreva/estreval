
test('general', ({ it, evaluate, run }) => {

  let context, code, result

  run('1+2+3+4/2*100', 1+2+3+4/2*100)

  run('1+2+3+4/2*100;123', 123)

  run('var k = 3;k+10', 13)

  context = { x: 3, o: { val: 10 } }

  run('if (x == 3) { "cats" } else { "dogs" }', 'cats', context)
  run('x == 3 ? "cats" : "dogs"', 'cats', context)

  evaluate('var key = "val"; x = 4 * 4; o[key] = 20', context)

  it('updates context property', context.x===16)
  it('updates context property\'s property', context.o.val===20)

  run('JSON.stringify({test: 123})', JSON.stringify({ test: 123 }))

  run('x = {"test": 1}', { test: 1 })
  run('x = {"test": -1}', { test: -1 })

  it('undefined exceptions', it.throws(() => {
    evaluate('y.u.no.error')
  }))

  // this

  run('[1,2,3,4].map(function(item){ return item*100 })', [100, 200, 300, 400])

  run('function test(arg){ return arg }; test(123)', 123)

  run('var test = (arg) => { return arg }; test(123)', 123)

  run('this', {}) // TODO: this===undefined or passed in?

  run('o = {f: function(){return this}, v: "test"}; o.f()===o', true)

  run('f = function(){return this.toString()}; f.apply("test")', 'test')

  // compound assignment

  run('var a = 1; a += 1; a', 2)
  run('var a = 1; a -= 1', 0)
  run('var a = 1; a++', 1)
  run('var a = 1; a++; a', 2)
  run('var a = 1; a--; a', 0)

  // logical expression

  run('123 && 456', 456)
  run('0 || 456', 456)


  run('typeof "text"', 'string')
  run('var obj = {}; obj instanceof Object', true)

  // for in

  run('var items = [1,2,3,4]; var result = []; for (var i=0;i<items.length;i++){ result.push(items[i]*100) } result', [100, 200, 300, 400])

  // for var in
  run('var items = [1,2,3,4]; var result = []; var i; for (i in items){ result.push(items[i]*100) } result', [100, 200, 300, 400])

  // while

  run('var items = [1,2,3,4]; var result = []; var i=0; while (i<items.length){ result.push(items[i]*100) ;i++ } result', [100, 200, 300, 400])

  // inner context parent

  run('var result = 0; [1,2,3,4].forEach(function(item){ result += item }); result', 10)

  // inner context shadow

  run('var result = 0; [1,2,3,4].forEach(function(item){ var result = 100 }); result', 0)

  // hoist functions

  it('hoist functions', !it.throws(() => {
    evaluate('func("test"); function func(arg){ return arg }')
  }))

  // hoist var

  run('var i = 123; (function(){ var result = i; var i; return result })()', undefined)
  run('var i = 123; (function(){ i = 456; var i; })(); i', 123)

  // early return

  run('(function(x){ return "test"; return "dogs" })()', "test")

  // continue

  run('var result = []; for (var i=0;i<5;i++){ if (i === 2){ continue } result.push(i) }; result', [0, 1, 3, 4])

  // break

  run('var result = []; for (var i=0;i<5;i++){ if (i === 3){ break } result.push(i) }; result', [0, 1, 2])

  // logic operator early return

  run('var result = false; function fail(){ result = true } result && fail(); result', false)

  run('var result = true; function fail(){ result = false } result || fail(); result', true)

  // new

  result = evaluate('var s = new String("test1"); s.prop = "test2"; s')

  it('toString', result.toString()==='test1')
  it('prop', result.prop==='test2')
  it('instanceof', result instanceof String)

  // let

  run('var x = 1; if (true) { let x = 3 }; x', 1)
  run('var x = 0; for (let x=1;x<2;x++){ let x=100 }; x', 0)
  run('var x = 0; for (var x=1;x<2;x++){ let x=100 }; x', 2)
  run('var x = 0, k; for (let x=1;x<2;x++){ k=100+x }; k', 101)

  // const

  run('var x = 1; if (true) { const x = 3 }; x', 1)
  run('const x = 2; x', 2)
  it('throws on const reassign', it.throws(() => {
    evaluate('const x = 1; x = 3')
  }))

  // try

  it('try', evaluate('var error; try{ __fail__.fail__() } catch(e) { error = e }; error') instanceof ReferenceError)

  it('throw', it.throws(() => {
    evaluate('var error; try{ __fail__.fail__() } catch(e) { error = e }; e')
  }))

  // switch

  code = 'var r = []; switch (x) { case 1: r.push(1); break; case 2: r.push(2); case 3: r.push(3); break; default: r.push("default") } r'

  it('switch 1', it.is(evaluate(code, { x: 1 }), [1]))
  it('switch 2', it.is(evaluate(code, { x: 2 }), [2, 3]))
  it('switch 3', it.is(evaluate(code, { x: 3 }), [3]))
  it('switch 4', it.is(evaluate(code, { x: 4 }), ['default']))

  run('function x(y) { switch(y) { case 1: return 1; case 2: return 2} } x(1)', 1)

  // pipeline operator

  // run('o = { k: 1 }; o |> x => { x.k++ }; o.k`', 2)

  // spread expression

  run('x = [1, 2]; y = [3, 4]; z = [...x, ...y]', [1, 2, 3, 4])
  run('x = { a: 1, b: 2 }; y = { c: 3, d: 4 }; z = { ...x, ...y }', { a: 1, b: 2, c: 3, d: 4 })
  run('((x, ...args) => [x, ...args])(1,2,3,4)', [1, 2, 3, 4])

})
