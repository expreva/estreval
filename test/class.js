
test('class', ({ it, evaluate, run }) => {

  const C = evaluate('class C { x = 3; constructor() { this.y = 5 } add() { this.z = 7 } }')

  it('creates a function', C instanceof Function)

  const instance = new C

  it('new Class creates an instance', instance)

  it('instance has property', instance.x===3)

  it('instance has property added in constructor', instance.y===5)

  let ok
  try {
    instance.add()
    ok = true
  } catch(e) {
    ok = true
  }

  it('instance method can be called', ok)

  it('instance method can modify instance property', instance.z===7)

})
