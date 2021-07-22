
test('object', ({ run }) => {

  // Delete property

  run('const o = { value: 1, another: 2 }; delete o.another; o', { value: 1 })

  run('const o = { value: 1, another: 2 }; key = "value"; delete o[key]; o', { another: 2 })

})
