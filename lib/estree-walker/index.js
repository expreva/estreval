// From https://github.com/Rich-Harris/estree-walker

// @ts-check
const { SyncWalker } = require('./sync.js');
const { AsyncWalker } = require('./async.js');

/** @typedef { import('estree').BaseNode} BaseNode */
/** @typedef { import('./sync.js').SyncHandler} SyncHandler */
/** @typedef { import('./async.js').AsyncHandler} AsyncHandler */

/**
 *
 * @param {BaseNode} ast
 * @param {{
 *   enter?: SyncHandler
 *   leave?: SyncHandler
 * }} walker
 * @returns {BaseNode}
 */
function walk(ast, { enter, leave }) {
	const instance = new SyncWalker(enter, leave);
	return instance.visit(ast, null);
}

/**
 *
 * @param {BaseNode} ast
 * @param {{
 *   enter?: AsyncHandler
 *   leave?: AsyncHandler
 * }} walker
 * @returns {Promise<BaseNode>}
 */
async function asyncWalk(ast, { enter, leave }) {
	const instance = new AsyncWalker(enter, leave);
	return await instance.visit(ast, null);
}

module.exports = {
  walk, asyncWalk
}