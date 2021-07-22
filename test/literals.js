
test('literals', ({ run }) => {

  run('null', null)

  run('undefined', undefined)

  run('0', 0)
  run('1', 1)
  run('""', '')
  run(`''`, '')
  run('"a"', 'a')
  run(`'a'`, 'a')
  run('[]', [])
  run('[0]', [0])
  run('[1,2,3]', [1, 2, 3])

  /**
   * An object must be wrapped in `()`, or it throws "SyntaxError:
   * Unexpected token".
   *
   * This shows a fundamental issue with the object notation `{ a: 0 }`,
   * because it cannot be distinguished from a scope, like `{ a = 0 }`.
   */
  // run('{}', {})

  run('({})', {})
  run('({ a: 0, b: 2, c: 3 })', { a: 0, b: 2, c: 3 })

  run('', undefined) // Same as eval('')
  run(';', undefined) // Same as eval(';')

})

test('template string', ({ run }) => {

  const context = {
    foo: 'hello',
    bar: 'world'
  }

  run('`${foo} ${bar}!`', 'hello world!', context)

})
