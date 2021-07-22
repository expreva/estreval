test('boolean', ({ it, evaluate, run }) => {
  run('Boolean()', Boolean())
  evaluate('Boolean.__proto__ = "test"')
  it('cannot modify Boolean.__proto__', Boolean.__proto__!=='test')
})

test('number', ({ it, evaluate, run }) => {
  run('Number()', Number())
  evaluate('Number.__proto__ = "test"')
  it('cannot modify Number.__proto__', Number.__proto__!=='test')
})

test('string', ({ it, evaluate, run }) => {
  run('String()', String())
  evaluate('String.__proto__ = "test"')
  it('cannot modify String.__proto__', String.__proto__!=='test')
})

test('object', ({ it, evaluate, run }) => {
  run('Object()', Object())
  evaluate('Object.__proto__ = "test"')
  it('cannot modify Object.__proto__', Object.__proto__!=='test')
})

test('array', ({ it, evaluate, run }) => {
  run('Array()', Array())
  evaluate('Array.__proto__ = "test"')
  it('cannot modify Array.__proto__', Array.__proto__!=='test')
})
