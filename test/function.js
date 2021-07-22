
test('function', ({ it, evaluate, run }) => {

  /**
   * A function must be wrapped in `()`, or it throws "SyntaxError:
   * Unexpected token". This is similar to object.
   */
  // const f = evaluate('function (arg) { return arg * 100 }')

  const f = evaluate('(function (arg) { return arg * 100 })')

  it('creates a function', f instanceof Function)
  it('function works', f(5)===500)

  run('[1, 2, 3, 10, 5].find(x => x == 10)', 10)
  run('[1, 2, 3, 10, 5].find(x => x == 8)', undefined)

})
