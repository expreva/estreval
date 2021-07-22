// From https://github.com/syntax-tree/estree-util-is-identifier-name

const {start: startRe, cont: contRe} = require('./regex.js')

/**
 * Checks if the given character code can start an identifier.
 *
 * @param {number} code
 */
// To do: support astrals.
function start(code) {
  return startRe.test(String.fromCharCode(code))
}

/**
 * Checks if the given character code can continue an identifier.
 *
 * @param {number} code
 */
// To do: support astrals.
function cont(code) {
  var character = String.fromCharCode(code)
  return startRe.test(character) || contRe.test(character)
}

/**
 * Checks if the given string is a valid identifier name.
 *
 * @param {string} name
 */
function name(name) {
  var index = -1

  while (++index < name.length) {
    if (!(index ? cont : start)(name.charCodeAt(index))) return false
  }

  // `false` if `name` is empty.
  return index > 0
}

module.exports = {
  start, cont, name
}