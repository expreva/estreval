const { Messages, InterruptThrowError, InterruptThrowReferenceError, InterruptThrowSyntaxError, } = require('./messages')

const version = '%VERSION%'

function defineFunctionName(func, name) {
  Object.defineProperty(func, 'name', {
    value: name,
    writable: false,
    enumerable: false,
    configurable: true,
  })
}

const hasOwnProperty = Object.prototype.hasOwnProperty
const Break = Symbol('Break')
const Continue = Symbol('Continue')
const DefaultCase = Symbol('DefaultCase')
const EmptyStatementReturn = Symbol('EmptyStatementReturn')
const WithScopeName = Symbol('WithScopeName')
const SuperScopeName = Symbol('SuperScopeName')
const RootScopeName = Symbol('RootScopeName')
const GlobalScopeName = Symbol('GlobalScopeName')

function isSymbol(t) {
  return typeof t == 'symbol' // || t instanceof SymbolClass
}

const memberKeyPrefix = '__smbl_'

function storeKey(t) {
  return `${memberKeyPrefix}${t.offset}_${t.val}`
}

function isFunction(func) {
  return typeof func === 'function'
}

class InternalInterpreterReflection {
  constructor(interpreter) {
    this.interpreter = interpreter
  }
  generator() {
    const interpreter = this.interpreter
    function getCurrentScope() {
      return this.getCurrentScope()
    }
    function getGlobalScope() {
      return this.getGlobalScope()
    }
    function getCurrentContext() {
      return this.getCurrentContext()
    }
    return {
      getOptions: interpreter.getOptions.bind(interpreter),
      getCurrentScope: getCurrentScope.bind(interpreter),
      getGlobalScope: getGlobalScope.bind(interpreter),
      getCurrentContext: getCurrentContext.bind(interpreter),
      getExecStartTime: interpreter.getExecStartTime.bind(interpreter),
    }
  }
}

function internalEval(reflection, code, useGlobalScope = true) {
  if (!(reflection instanceof InternalInterpreterReflection)) {
    throw new Error('Illegal call')
  }
  if (typeof code !== 'string')
    return code
  if (!code)
    return void 0
  const instance = reflection.generator()
  const opts = instance.getOptions()
  const options = {
    timeout: opts.timeout,
    _initEnv: function () {
      // set caller context
      if (!useGlobalScope) {
        this.setCurrentContext(instance.getCurrentContext())
      }
      // share timeout
      this.execStartTime = instance.getExecStartTime()
      this.execEndTime = this.execStartTime
      // share steps
      this.step = instance.step
    },
  }
  const currentScope = useGlobalScope ? instance.getGlobalScope() : instance.getCurrentScope()
  const interpreter = new Interpreter(currentScope, options)
  return interpreter.evaluate(code)
}

Object.defineProperty(internalEval, '__IS_EVAL_FUNC', {
  value: true,
  writable: false,
  enumerable: false,
  configurable: false,
})

function internalFunction(reflection, ...params) {
  if (!(reflection instanceof InternalInterpreterReflection)) {
    throw new Error('Illegal call')
  }
  const instance = reflection.generator()
  const code = params.pop()
  const interpreter = new Interpreter(instance.getGlobalScope(), instance.getOptions())

  const wrapCode = `(function anonymous(${params.join(',')}) { ${code} });`

  return interpreter.evaluate(wrapCode)
}

Object.defineProperty(internalFunction, '__IS_FUNCTION_FUNC', {
  value: true,
  writable: false,
  enumerable: false,
  configurable: false,
})

class Return {
  constructor(value) {
    this.value = value
  }
}

class BreakLabel {
  constructor(value) {
    this.value = value
  }
}

class ContinueLabel {
  constructor(value) {
    this.value = value
  }
}

/**
 * scope chain
 *
 * superScope
 *     ↓
 * rootScope
 *     ↓
 * globalScope
 *     ↓
 * functionScope
 *
 */
class Scope {
  constructor(data, parent = null, name, type = 'function') {
    this.name = name
    this.parent = parent
    this.data = data
    this.labelStack = []
    this.type = type
    this.lexDeclared = Object.create(null)
  }
}

function noop() {}

function createScope(parent = null, name, type) {
  return new Scope(Object.create(null), parent, name, type)
}

function createRootContext(data) {
  return Object.create(data)
}


const BuildInObjects = {
  NaN,
  Infinity,

  Object,
  Array,
  String,
  Boolean,
  Number,
  Date,
  RegExp,
  Error,
  URIError,
  TypeError,
  RangeError,
  SyntaxError,
  ReferenceError,
  Math,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  decodeURI,
  decodeURIComponent,
  encodeURI,
  encodeURIComponent,
  escape,
  unescape,

  undefined,
  // null,
  eval: internalEval,
  Function: internalFunction,
}

// ES5 Object
if (typeof JSON !== 'undefined') {
  BuildInObjects.JSON = JSON
}
//ES6 Object
if (typeof Promise !== 'undefined') {
  BuildInObjects.Promise = Promise
}
if (typeof Set !== 'undefined') {
  BuildInObjects.Set = Set
}
if (typeof Map !== 'undefined') {
  BuildInObjects.Map = Map
}
if (typeof Symbol !== 'undefined') {
  BuildInObjects.Symbol = Symbol
}
if (typeof Proxy !== 'undefined') {
  BuildInObjects.Proxy = Proxy
}
if (typeof WeakMap !== 'undefined') {
  BuildInObjects.WeakMap = WeakMap
}
if (typeof WeakSet !== 'undefined') {
  BuildInObjects.WeakSet = WeakSet
}
if (typeof Reflect !== 'undefined') {
  BuildInObjects.Reflect = Reflect
}

const globalOrWindow = typeof window!=='undefined' ? window : global

// Used in classExpressionHandler

function setKeyVal(_this, item, val){
  let keyval
  let sbl = false
  if(item.name.computed){
    let t = (item.name.value)()
    if(isSymbol(t)){
      sbl = true
      keyval = storeKey(t)
    }else{
      keyval = t
    }
  }else{
    keyval = item.name.value
  }
  if(sbl){
    Object.defineProperty(_this, keyval, {
      value: val,
      writable: true,
      enumerable: false,
      configurable: true,
    })
  }else{
    _this[keyval] = val
  }
}

let extendStatics = function (d, b) {
  // ?!
  extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b }) ||
        function (d, b) { for (var p in b) if (hasOwnProperty.call(b, p)) d[p] = b[p] }
  return extendStatics(d, b)
}

function __extend(child, father) {
  extendStatics(child, father)
  function __() { this.constructor = father }
  child.prototype = father === null ? Object.create(father) : (__.prototype = father.prototype, new __())
}


class Interpreter {

  constructor(context = Interpreter.global, options = {}) {
    this.reset(context, options)
  }

  reset(context = Interpreter.global, options = {}) {

    // Default or custom parser must be passed in options
    this.parse = options.parse || this.parse
    if (!this.parse) throw new Error('Option "parse" is required')

    // this.sourceList = []
    this.collectDeclVars = Object.create(null)
    this.collectDeclFuncs = Object.create(null)
    this.collectDeclLex = []
    this.isVarDeclMode = false
    this.lastExecNode = null
    this.isRunning = false
    this.maxSteps = typeof options.maxSteps!=='undefined'
      ? options.maxStep
      : 1024 // Default max steps
    this.timeout = options.timeout!=null ? options.timeout : 100 // Default time out

    this.options = {
      ecmaVersion: options.ecmaVersion || Interpreter.ecmaVersion,
      timeout: this.timeout,
      rootContext: options.rootContext,
      globalContextInFunction: options.globalContextInFunction === undefined
        ? Interpreter.globalContextInFunction
        : options.globalContextInFunction,
      _initEnv: options._initEnv,
      parse: this.parse,
      maxSteps: this.maxSteps,
      source: options.source
    }
    this.context = context || Object.create(null)
    this.callStack = []
    this.initEnvironment(this.context)
  }

  initEnvironment(ctx) {
    let scope
    //init global scope
    if (ctx instanceof Scope) {
      scope = ctx
    }
    else {
      let rootScope = null
      const superScope = this.createSuperScope(ctx)
      if (this.options.rootContext) {
        rootScope = new Scope(createRootContext(this.options.rootContext), superScope, RootScopeName)
      }
      scope = new Scope(ctx, rootScope || superScope, GlobalScopeName)
    }
    this.globalScope = scope
    this.currentScope = this.globalScope
    //init global context to this
    this.globalContext = scope.data
    this.currentContext = scope.data
    // collect var/function declare
    this.collectDeclVars = Object.create(null)
    this.collectDeclFuncs = Object.create(null)
    this.execStartTime = Date.now()
    this.execEndTime = this.execStartTime
    this.step = 0

    const _initEnv = this.options._initEnv
    if (_initEnv) {
      _initEnv.call(this)
    }
  }

  getExecStartTime() {
    return this.execStartTime
  }

  getExecutionTime() {
    return this.execEndTime - this.execStartTime
  }

  setExecTimeout(timeout = 0) {
    this.this.timeout = timeout
  }

  getOptions() {
    return this.options
  }

  getGlobalScope() {
    return this.globalScope
  }

  getCurrentScope() {
    return this.currentScope
  }

  getCurrentContext() {
    return this.currentContext
  }

  isInterruptThrow(err) {
    return (err instanceof InterruptThrowError ||
            err instanceof InterruptThrowReferenceError ||
            err instanceof InterruptThrowSyntaxError)
  }

  isBuiltInObject(obj) {
    for (const globalKey in BuildInObjects) {
      if (obj===BuildInObjects[globalKey]) {
        return true
      }
    }
    return false
  }

  createSuperScope(ctx) {
    let data = {
      ...BuildInObjects,
    }
    const buildInObjectKeys = Object.keys(data)
    buildInObjectKeys.forEach(key => {
      if (key in ctx) {
        delete data[key]
      }
    })
    return new Scope(data, null, SuperScopeName)
  }

  setCurrentContext(ctx) {
    this.currentContext = ctx
  }

  setCurrentScope(scope) {
    this.currentScope = scope
  }

  evaluate(code = '') {

    let node
    if (!code) return

    node = typeof code ==='string'
      ? this.parse(code, {
        ecmaVersion: this.options.ecmaVersion || Interpreter.ecmaVersion,
      })
      : code // parse node tree

    return this.evaluateNode(node, code)
  }

  appendCode(code) {
    return this.evaluate(code)
  }

  evaluateNode(node, source = '') {
    this.value = undefined

    this.source = typeof source==='string'
      ? source
      : this.options.source || ''
    // this.sourceList.push(source) // Don't store source lines

    this.isRunning = true
    //reset timeout
    this.execStartTime = Date.now()
    this.execEndTime = this.execStartTime
    this.step = 0
    // reset
    this.collectDeclVars = Object.create(null)
    this.collectDeclFuncs = Object.create(null)
    const currentScope = this.getCurrentScope()
    const currentContext = this.getCurrentContext()
    const labelStack = currentScope.labelStack.concat([])
    const callStack = this.callStack.concat([])
    const reset = () => {
      this.setCurrentScope(currentScope) //reset scope
      this.setCurrentContext(currentContext) //reset context
      currentScope.labelStack = labelStack //reset label stack
      this.callStack = callStack //reset call stack
    }
    // start run
    try {
      const bodyClosure = this.createClosure(node)
      // add declares to data
      this.addDeclarationsToScope(this.collectDeclVars, this.collectDeclFuncs, this.getCurrentScope())
      bodyClosure()
    }
    catch (e) { // eslint-disable-line no-useless-catch
      throw e
    }
    finally {
      reset()
      this.execEndTime = Date.now()
    }
    this.isRunning = false
    return this.getValue()
  }

  createErrorMessage(msg, value, node) {
    let message = msg[1].replace('%0', String(value))
    if (node !== null) {
      message += this.getNodePosition(node || this.lastExecNode)
    }
    return message
  }

  createError(message, error) {
    return new error(message)
  }

  createThrowError(message, error) {
    return this.createError(message, error)
  }

  createInternalThrowError(msg, value, node) {
    return this.createError(this.createErrorMessage(msg, value, node), msg[2])
  }

  checkTimeout() {
    if (!this.isRunning)
      return false
    const timeout = this.timeout || 0
    const now = Date.now()
    if (now - this.execStartTime > timeout) {
      return true
    }
    return false
  }

  checkMaxSteps() {
    if (!this.isRunning) return false
    this.step++
    return this.step > this.options.maxSteps
  }

  getNodePosition(node) {
    if (node) {
      const errorCode = '' //this.source.slice(node.start, node.end);
      return node.loc ? ` [${node.loc.start.line}:${node.loc.start.column}]${errorCode}` : ''
    }
    return ''
  }

  createClosure(node) {
    let closure
    switch (node.type) {
    case 'ClassDeclaration':
      closure = this.classDeclarationHandler(node)
      break
    case 'ClassExpression':
      closure = this.classExpressionHandler(node)
      break
    case 'Super':
      closure = this.superHandler(node)
      break
    case 'BinaryExpression':
      closure = this.binaryExpressionHandler(node)
      break
    case 'LogicalExpression':
      closure = this.logicalExpressionHandler(node)
      break
    case 'UnaryExpression':
      closure = this.unaryExpressionHandler(node)
      break
    case 'UpdateExpression':
      closure = this.updateExpressionHandler(node)
      break
    case 'ObjectExpression':
      closure = this.objectExpressionHandler(node)
      break
    case 'ArrayExpression':
      closure = this.arrayExpressionHandler(node)
      break
    case 'CallExpression':
      closure = this.callExpressionHandler(node)
      break
    case 'NewExpression':
      closure = this.newExpressionHandler(node)
      break
    case 'MemberExpression':
      closure = this.memberExpressionHandler(node)
      break
    case 'ThisExpression':
      closure = this.thisExpressionHandler(node)
      break
    case 'SequenceExpression':
      closure = this.sequenceExpressionHandler(node)
      break
    case 'Literal':
      closure = this.literalHandler(node)
      break
    case 'TemplateLiteral':
      closure = this.templateLiteralHandler(node)
      break
    case 'Identifier':
      closure = this.identifierHandler(node)
      break
    case 'AssignmentExpression':
      closure = this.assignmentExpressionHandler(node)
      break
    case 'FunctionDeclaration':
      closure = this.functionDeclarationHandler(node)
      break
    case 'VariableDeclaration':
      closure = this.variableDeclarationHandler(node)
      break
    case 'BlockStatement':
    case 'Program':
      closure = this.programHandler(node)
      break
    case 'ExpressionStatement':
      closure = this.expressionStatementHandler(node)
      break
    case 'EmptyStatement':
      closure = this.emptyStatementHandler(node)
      break
    case 'ReturnStatement':
      closure = this.returnStatementHandler(node)
      break
    case 'FunctionExpression':
      closure = this.functionExpressionHandler(node)
      break
    case 'ArrowFunctionExpression':
      closure = this.arrowFunctionExpressionHandler(node)
      break
    case 'IfStatement':
      closure = this.ifStatementHandler(node)
      break
    case 'ConditionalExpression':
      closure = this.conditionalExpressionHandler(node)
      break
    case 'ForStatement':
      closure = this.forStatementHandler(node)
      break
    case 'WhileStatement':
      closure = this.whileStatementHandler(node)
      break
    case 'DoWhileStatement':
      closure = this.doWhileStatementHandler(node)
      break
    case 'ForInStatement':
      closure = this.forInStatementHandler(node)
      break
    case 'WithStatement':
      closure = this.withStatementHandler(node)
      break
    case 'ThrowStatement':
      closure = this.throwStatementHandler(node)
      break
    case 'TryStatement':
      closure = this.tryStatementHandler(node)
      break
    case 'ContinueStatement':
      closure = this.continueStatementHandler(node)
      break
    case 'BreakStatement':
      closure = this.breakStatementHandler(node)
      break
    case 'SwitchStatement':
      closure = this.switchStatementHandler(node)
      break
    case 'LabeledStatement':
      closure = this.labeledStatementHandler(node)
      break
    case 'DebuggerStatement':
      closure = this.debuggerStatementHandler(node)
      break
    case 'GroupStatement':
      closure = this.groupStatementHandler(node)
      break
    case 'SpreadElement':
      closure = this.spreadElementHandler(node)
      break

    // case 'JSXElement':
    //   closure = this.JSXElementHandler(node)
    //   break
    // case 'JSXExpressionContainer':
    //   closure = this.JSXExpressionContainerHandler(node)
    //   break
    // case 'JSXIdentifier':
    //   closure = this.JSXIdentifierHandler(node)
    //   break
    // case 'JSXAttribute':
    //   closure = this.JSXAttributeHandler(node)
    //   break
    // case 'JSXSpreadAttribute':
    //   closure = this.JSXSpreadAttributeHandler(node)
    //   break
    // case 'JSXMemberExpression':
    //   closure = this.JSXMemberExpressionHandler(node)
    //   break
    // case 'JSXOpeningElement':
    //   // 在jsxelement就处理了，不可能到这里
    //   break
    // case 'JSXText':
    //   closure = this.JSXTextHandler(node)
    //   break
    // case 'JSXEmptyExpression':
    //   closure = () => null
    //   break
    default:
      throw this.createInternalThrowError(Messages.NodeTypeSyntaxError, node.type, node)
    }
    return (...args) => {
      const timeout = this.timeout
      if (timeout && timeout > 0 && this.checkTimeout()) {
        throw this.createInternalThrowError(Messages.ExecutionTimeOutError, timeout, null)
      }
      if (this.checkMaxSteps()) {
        throw this.createInternalThrowError(Messages.MaxStepsError, this.maxSteps, null)
      }
      this.lastExecNode = node
      return closure(...args)
    }
  }

  // a==b a/b
  binaryExpressionHandler(node) {
    const leftExpression = this.createClosure(node.left)
    const rightExpression = this.createClosure(node.right)
    return () => {
      const leftValue = leftExpression()
      const rightValue = rightExpression()
      switch (node.operator) {
      case '==':
        return leftValue == rightValue
      case '!=':
        return leftValue != rightValue
      case '===':
        return leftValue === rightValue
      case '!==':
        return leftValue !== rightValue
      case '<':
        return leftValue < rightValue
      case '<=':
        return leftValue <= rightValue
      case '>':
        return leftValue > rightValue
      case '>=':
        return leftValue >= rightValue
      case '<<':
        return leftValue << rightValue
      case '>>':
        return leftValue >> rightValue
      case '>>>':
        return leftValue >>> rightValue
      case '+':
        return leftValue + rightValue
      case '-':
        return leftValue - rightValue
      case '*':
        return leftValue * rightValue
      case '**':
        return Math.pow(leftValue, rightValue)
      case '/':
        return leftValue / rightValue
      case '%':
        return leftValue % rightValue
      case '|':
        return leftValue | rightValue
      case '^':
        return leftValue ^ rightValue
      case '&':
        return leftValue & rightValue
      case 'in':
        return leftValue in rightValue
      case 'instanceof':
        return leftValue instanceof rightValue
      case '|>':
        if (typeof rightValue!=='function') {
          throw new TypeError('Right side of pipeline must be a function')
        }
        return rightValue(leftValue)
      default:
        throw this.createInternalThrowError(Messages.BinaryOperatorSyntaxError, node.operator, node)
      }
    }
  }

  // a && b
  logicalExpressionHandler(node) {
    const leftExpression = this.createClosure(node.left)
    const rightExpression = this.createClosure(node.right)
    return () => {
      switch (node.operator) {
      case '||':
        return leftExpression() || rightExpression()
      case '&&':
        return leftExpression() && rightExpression()
      default:
        throw this.createInternalThrowError(Messages.LogicalOperatorSyntaxError, node.operator, node)
      }
    }
  }

  // protected isRootScope(node: ESTree.Expression | ESTree.Pattern): boolean {
  //   if (node.type === 'Identifier') {
  //     const scope = this.getScopeFromName(node.name, this.getCurrentScope());
  //     return scope.name === 'rootScope';
  //   }
  //   return false;
  // }
  // typeof a !a()

  unaryExpressionHandler(node) {
    switch (node.operator) {
    case 'delete': {
      const objectGetter = this.createObjectGetter(node.argument)
      const nameGetter = this.createNameGetter(node.argument)
      return () => {
        // not allowed to delete root scope property
        // rootContext has move to prototype chai, so no judgment required
        // if (this.isRootScope(node.argument)) {
        //   return false;
        // }
        let obj = objectGetter()
        const name = nameGetter()
        return delete obj[name]
      }
    }
    default: {
      let expression
      // for typeof undefined var
      // typeof adf9ad
      if (node.operator === 'typeof' && node.argument.type === 'Identifier') {
        const objectGetter = this.createObjectGetter(node.argument)
        const nameGetter = this.createNameGetter(node.argument)
        expression = () => objectGetter()[nameGetter()]
      }
      else {
        expression = this.createClosure(node.argument)
      }
      return () => {
        const value = expression()
        switch (node.operator) {
        case '-':
          return -value
        case '+':
          return +value
        case '!':
          return !value
        case '~':
          return ~value
        case 'void':
          return void value
        case 'typeof':
          return typeof value
        default:
          throw this.createInternalThrowError(Messages.UnaryOperatorSyntaxError, node.operator, node)
        }
      }
    }}
  }

  // ++a --a
  updateExpressionHandler(node) {
    const objectGetter = this.createObjectGetter(node.argument)
    const nameGetter = this.createNameGetter(node.argument)
    return () => {
      const obj = objectGetter()
      const name = nameGetter()
      this.assertVariable(obj, name, node)
      switch (node.operator) {
      case '++':
        return node.prefix ? ++obj[name] : obj[name]++
      case '--':
        return node.prefix ? --obj[name] : obj[name]--
      default:
        throw this.createInternalThrowError(Messages.UpdateOperatorSyntaxError, node.operator, node)
      }
    }
  }

  // var o = {a: 1, b: 's', get name(){}, set name(){}  ...}
  objectExpressionHandler(node) {
    const items = [] // { key, property, spread }[]

    function getKey(keyNode) {
      if (keyNode.type === 'Identifier') {
        // var o = {a:1}
        return keyNode.name
      } else if (keyNode.type === 'Literal') {
        // var o = {'a':1}
        return keyNode.value
      } else {
        return this.throwError(Messages.ObjectStructureSyntaxError, keyNode.type, keyNode)
      }
    }
    // collect value, getter, and/or setter.
    const properties = Object.create(null) // { [prop: string]: { init, get, set } }
    const computedProperties = [] // { keyClosure, kind: 'init' | 'get' | 'set', valueClosure }[]

    node.properties.forEach(property => {
      if (property.type == 'Property') {
        const kind = property.kind
        if (!property.computed) {
          const key = getKey(property.key)

          if (!properties[key] || kind === 'init') {
            properties[key] = {}
          }

          properties[key][kind] = this.createClosure(property.value)

          items.push({
            key,
            property,
          })
        } else {
          const keyClosure = this.createClosure(property.key)
          computedProperties.push({
            keyClosure,
            kind,
            valueClosure: this.createClosure(property.value)
          })

        }
      } else if (property.type == 'SpreadElement') {
        // ts声明没有这个type，也是醉了
        items.push({
          // @ts-ignore
          spread: this.createClosure(property.argument)
        })
      }
    })

    return () => {
      const result = {}
      const len = items.length
      const MArray = this.globalScope.data['Array']
      // 非computed属性。保证顺序
      for (let i = 0; i < len; i++) {
        const item = items[i]
        if (item.key != null) {
          // named property
          const key = item.key
          const kinds = properties[key]
          const value = kinds.init ? kinds.init() : undefined
          const getter = kinds.get ? kinds.get() : function () { }
          const setter = kinds.set ? kinds.set() : function (a) { }

          if ('set' in kinds || 'get' in kinds) {
            const descriptor = {
              configurable: true,
              enumerable: true,
              get: getter,
              set: setter,
            }
            Object.defineProperty(result, key, descriptor)
          } else {
            const property = item.property
            const kind = property.kind
            // set function.name
            // var d = { test(){} }
            // var d = { test: function(){} }
            if (
              property.key.type === 'Identifier' &&
                        property.value.type === 'FunctionExpression' &&
                        kind === 'init' &&
                        !property.value.id
            ) {
              defineFunctionName(value, property.key.name)
            }
            result[key] = value
          }
        } else {
          // spread object
          let targetObj = item.spread && item.spread()
          if (targetObj && Array.isArray(targetObj)) {
            for(let i=0;i<targetObj.length;i++){
              result[String(i)] = targetObj[i]
            }
          } else if(targetObj && typeof targetObj === 'object') {
            // 解构只解构本身的属性，且不会copy不能枚举的和setter，copy的getter也会转换为一个简单的property
            let keys = Object.getOwnPropertyNames(targetObj)
            keys.forEach(key=>{
              result[key] = targetObj[key]
            })
          } else {
            // 试了一下，在spread element非法的情况下，会忽略而不报错
            continue
          }
        }
      }

      let prop = {}
      computedProperties.forEach(pr=>{
        let key = pr.keyClosure()
        let isSb = isSymbol(key)
        let name = isSb?storeKey(key):key
        if(!prop[name]){prop[name] = {}}
        prop[name][pr.kind] = pr.valueClosure()
        prop[name]['symbol'] = isSb
      })
      Object.getOwnPropertyNames(prop).forEach(name=>{
        let item = prop[name]
        if ('set' in item || 'get' in item) {
          const descriptor = {
            configurable: true,
            enumerable: item.symbol?false:true,
            get: item.get || function () { },
            set: item.set || function (a) { },
          }
          Object.defineProperty(result, name, descriptor)
        } else {
          if(item.symbol){
            Object.defineProperty(result, name, {
              value: item.init,
              writable: true,
              enumerable: false,
              configurable: true,
            })
          } else {
            result[name] = item.init
          }
        }
      })

      return result
    }
  }

  // [1,2,3]
  arrayExpressionHandler(node) {
    //fix: [,,,1,2]
    const items = node.elements.map(element =>{
      if (!element) return null
      return {
        type: element.type,
        closure: element.type == 'SpreadElement'
          ? this.createClosure(element.argument)
          : this.createClosure(element)
      }
    })
    return () => {
      const len = items.length
      let result = [] // new this.globalScope.data['Array']
      for (let i = 0; i < len; i++) {
        const item = items[i]
        if (!item) {
          result.push(undefined)
        } else {
          if(item.type == 'SpreadElement'){
            let arr = item.closure()
            if(!Array.isArray(arr)){
              throw this.createInternalThrowError(Messages.NormalError, 'cannot spread, not an array type', node)
            }
            result = result.concat(arr)
          } else {
            result.push(item.closure())
          }
        }
      }

      return result
    }
  }

  safeObjectGet(obj, key, node) {
    return obj[key]
  }

  createCallFunctionGetter(node) {
    switch (node.type) {
    case 'MemberExpression': {
      const objectGetter = this.createClosure(node.object)
      const keyGetter = this.createMemberKeyGetter(node)
      const source = this.source
      return () => {
        const obj = objectGetter()
        const key = keyGetter()
        const func = this.safeObjectGet(obj, key, node)
        if (!func || !isFunction(func)) {
          const name = source.slice(node.start, node.end)
          throw this.createInternalThrowError(Messages.FunctionUndefinedReferenceError, name, node)
        }
        // obj.eval = eval
        // obj.eval(...)
        if (func.__IS_EVAL_FUNC) {
          return (code) => {
            return func(new InternalInterpreterReflection(this), code, true)
          }
        }
        // obj.func = Function
        // obj.func(...)
        if (func.__IS_FUNCTION_FUNC) {
          return (...args) => {
            return func(new InternalInterpreterReflection(this), ...args)
          }
        }
        // method call
        // eg：obj.say(...)
        // eg: obj.say.call(...)
        // eg: obj.say.apply(...)
        // ======================
        // obj.func(...)
        // func = func.bind(obj)
        // tips:
        // func(...) -> func.bind(obj)(...)
        // func.call(...) -> obj.func.call.bind(obj.func)(...)
        // func.apply(...) -> obj.func.apply.bind(obj.func)(...)
        // ...others
        return func.bind(obj)
      }
    }
    default: {
      // test() or (0,test)() or a[1]() ...
      const closure = this.createClosure(node)
      return () => {
        let name = ''
        if (node.type === 'Identifier') {
          name = node.name
        }
        // const name: string = (<ESTree.Identifier>node).name;
        const func = closure()
        if (!func || !isFunction(func)) {
          throw this.createInternalThrowError(Messages.FunctionUndefinedReferenceError, name, node)
        }
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
        // var eval = eval;
        // function test(){
        //    eval(...); //note: use local scope in eval5，but in Browser is use global scope
        // }
        if (node.type === 'Identifier' && func.__IS_EVAL_FUNC && name === 'eval') {
          return (code) => {
            const scope = this.getScopeFromName(name, this.getCurrentScope())
            const useGlobalScope = scope.name === SuperScopeName ||
                                // !scope.parent || // super scope
                                scope.name === GlobalScopeName ||
                                // this.globalScope === scope ||
                                scope.name === RootScopeName
            // use local scope if calling eval in super scope
            return func(new InternalInterpreterReflection(this), code, !useGlobalScope)
          }
        }
        // use global scope
        // var g_eval = eval;
        // g_eval('a+1');
        //(0,eval)(...) ...eval alias
        if (func.__IS_EVAL_FUNC) {
          return (code) => {
            return func(new InternalInterpreterReflection(this), code, true)
          }
        }
        // Function('a', 'b', 'return a+b')
        if (func.__IS_FUNCTION_FUNC) {
          return (...args) => {
            return func(new InternalInterpreterReflection(this), ...args)
          }
        }
        let ctx = this.options.globalContextInFunction
        // with(obj) {
        //     test() // test.call(obj, ...)
        // }
        if (node.type === 'Identifier') {
          const scope = this.getIdentifierScope(node)
          if (scope.name === WithScopeName) {
            ctx = scope.data
          }
        }
        // function call
        // this = undefined
        // tips:
        // test(...) === test.call(undefined, ...)
        // fix: alert.call({}, ...) Illegal invocation
        return func.bind(ctx)
      }
    }}
  }

  // func()
  callExpressionHandler(node) {
    const funcGetter = this.createCallFunctionGetter(node.callee)
    const argsGetter = node.arguments.map(arg => ({
      type: arg.type,
      closure: this.createClosure(arg)
    }))
    return () => {
      let args = []
      for(let i=0;i<argsGetter.length;i++){
        let arg = argsGetter[i]
        if(arg.type === 'SpreadElement'){
          args = args.concat(arg.closure())
        }else{
          args.push(arg.closure())
        }
      }
      return funcGetter()(...args)
    }
  }

  // var f = function() {...}
  functionExpressionHandler(node) {
    const self = this
    const source = this.source
    const oldDeclVars = this.collectDeclVars
    const oldDeclFuncs = this.collectDeclFuncs
    const oldDeclLex = this.collectDeclLex

    // Prepare the declaration hoist variable of the new scope
    this.collectDeclVars = Object.create(null)
    this.collectDeclFuncs = Object.create(null)
    this.collectDeclLex = []
    const name = node.id ? node.id.name : "" /**anonymous*/

    // Variable parameters are not counted in function.length
    const paramLength = node.params.filter(_=>_.type!='RestElement').length

    const paramsGetter = node.params.map(param => ({
      type: param.type,
      closure: this.createParamNameGetter(param)
    }))
    this.blockDeclareStart()
    // set scope
    const bodyClosure = this.createClosure(node.body)
    let lexDecls = this.blockDeclareEnd()

    // 这里是准备好的变量和函数声明提升
    const declVars = this.collectDeclVars
    const declFuncs = this.collectDeclFuncs
    const declLex = this.collectDeclLex

    this.collectDeclVars = oldDeclVars
    this.collectDeclFuncs = oldDeclFuncs
    this.collectDeclLex = oldDeclLex

    // Create a new scope and return a function, which will be executed in the newly created scope
    return (scope) => {
      // bind current scope

      // Note that the scope of a function execution is not the scope of the actual call,
      // but the scope of the code location when it is declared. The scope of the function
      // name declaration is equivalent to the scope of the var functionName declaration
      const runtimeScope = scope || self.getCurrentScope()

      const func = function (...args) {
        self.callStack.push(`${name}`)

        const prevScope = self.getCurrentScope()
        const prev_functionVarScope = self._functionVarScope
        //
        const currentScope = createScope(runtimeScope, `FunctionScope(${name})`)
        currentScope.lexDeclared = lexDecls

        self.setCurrentScope(currentScope)
        // console.info('the current scope is ', currentScope)

        // When the function is executed, a new scope is created, and the next line points the running pointer of the program to the new scope
        self.addDeclarationsToScope(declVars, declFuncs, currentScope)
        self._functionVarScope = currentScope
        // var t = function(){ typeof t } // function
        // t = function(){ typeof t } // function
        // z = function tx(){ typeof tx } // function
        // but
        // d = { say: function(){ typeof say } } // undefined
        if (name) {
          currentScope.data[name] = func
        }
        // init arguments var
        currentScope.data["arguments"] = arguments

        paramsGetter.forEach((getter, i) => {
          if(getter.type === 'RestElement'){
            currentScope.data[getter.closure()] = args.slice(i)
          }else{
            currentScope.data[getter.closure()] = args[i]
          }
        })

        // init this
        const prevContext = self.getCurrentContext()
        //for ThisExpression
        self.setCurrentContext(this)

        // Run
        const result = bodyClosure()

        // Restore
        self.setCurrentContext(prevContext)
        self.setCurrentScope(prevScope)
        self._functionVarScope = prev_functionVarScope
        self.callStack.pop()

        if (result instanceof Return) {
          return result.value
        }
      }

      defineFunctionName(func, name)

      Object.defineProperty(func, "length", {
        value: paramLength,
        writable: false,
        enumerable: false,
        configurable: true,
      })

      Object.defineProperty(func, "toString", {
        value: () => {
          return source.slice(node.start, node.end)
        },
        writable: true,
        configurable: true,
        enumerable: false,
      })

      Object.defineProperty(func, "valueOf", {
        value: () => {
          return source.slice(node.start, node.end)
        },
        writable: true,
        configurable: true,
        enumerable: false,
      })

      return func
    }
  }


  /**
   * Statements containing block-level scope are executed before declaration.
   * Create a new hash to record the let/const variables declared in the block scope
   */
  blockDeclareStart() {
    this.collectDeclLex.push(Object.create(null))
  }

  /**
   * Execute after the statement containing the block-level scope is declared,
   * exit the stack, and get the let/const variable declared by the block-scope
   */
  blockDeclareEnd() {
    // Prepare necessary parameters for block-level scope initialization
    let lexDeclInThisBlock = this.collectDeclLex.pop()
    let lexDeclared
    let lexNames = Object.getOwnPropertyNames(lexDeclInThisBlock)
    if (lexNames.length) {
      lexDeclared = Object.create(null)
      lexNames.forEach(key => {
        if (lexDeclared!=null) lexDeclared[key] = {
          init: false,
          kind: lexDeclInThisBlock ? lexDeclInThisBlock[key].kind : undefined
        }
      })
    } else {
      // No lexical variable, then there is no need to create a new scope
      lexDeclared = null
    }
    return lexDeclared
  }

  arrowFunctionExpressionHandler(node) {
    const source = this.source
    const oldDeclVars = this.collectDeclVars
    const oldDeclFuncs = this.collectDeclFuncs
    const oldDeclLex = this.collectDeclLex

    // Prepare the declaration variables of the new scope
    this.collectDeclVars = Object.create(null)
    this.collectDeclFuncs = Object.create(null)
    this.collectDeclLex = []
    const name = 'anonymous_arrow_func' /**anonymous*/
    const paramLength = node.params.length

    const paramsGetter = node.params.map(param => ({
      type: param.type,
      closure: this.createParamNameGetter(param),
    }))
    this.blockDeclareStart()
    // set scope
    const bodyClosure = this.createClosure(node.expression===true ? {
      type: 'GroupStatement',
      body: [{
        type: 'ReturnStatement',
        argument: node.body,
      }]
    } : node.body)

    let lexDecls = this.blockDeclareEnd()

    // Prepared variable and function declaration
    const declVars = this.collectDeclVars
    const declFuncs = this.collectDeclFuncs
    const declLex = this.collectDeclLex

    this.collectDeclVars = oldDeclVars
    this.collectDeclFuncs = oldDeclFuncs
    this.collectDeclLex = oldDeclLex

    // Create a new scope and return a function, which will be executed
    // in the newly created scope
    return () => {
      // bind current scope
      // The scope and context of the arrow function are determined when
      // the function is declared.
      const runtimeScope = this.getCurrentScope()
      const ctx = this.getCurrentContext()

      const func = (...args) => {
        this.callStack.push(`${name}`)

        const prevScope = this.getCurrentScope()
        // When the function is executed, a new scope is created, and
        // the next line points the running pointer of the program to the new scope
        const currentScope = createScope(runtimeScope, `FunctionScope(${name})`)
        currentScope.lexDeclared = lexDecls!=null
        this.setCurrentScope(currentScope)
        // Assign prepared variables and function declarations to the new scope
        this.addDeclarationsToScope(declVars, declFuncs, currentScope)

        // var t = function(){ typeof t } // function
        // t = function(){ typeof t } // function
        // z = function tx(){ typeof tx } // function
        // but
        // d = { say: function(){ typeof say } } // undefined

        // arrow-function has no 'arguments'
        // currentScope.data['arguments'] = arguments;

        paramsGetter.forEach((getter, i) => {
          if (getter.type === 'RestElement'){
            currentScope.data[getter.closure()] = args.slice(i)
          } else {
            currentScope.data[getter.closure()] = args[i]
          }
        })

        // init this
        const prevContext = this.getCurrentContext()
        //for ThisExpression
        this.setCurrentContext(ctx)

        // 执行
        const result = bodyClosure()
        // 恢复
        this.setCurrentContext(prevContext)
        this.setCurrentScope(prevScope)
        this.callStack.pop()

        if (result instanceof Return) {
          return result.value
        }
      }

      // todo: let foo = ()=>{}, foo.name==='foo'
      defineFunctionName(func, name)

      // arrow-func has no .length
      // Object.defineProperty(func, 'length', {
      //     value: paramLength,
      //     writable: false,
      //     enumerable: false,
      //     configurable: true,
      // });

      Object.defineProperty(func, 'toString', {
        value: () => {
          return source.slice(node.start, node.end)
        },
        writable: true,
        configurable: true,
        enumerable: false,
      })

      Object.defineProperty(func, 'valueOf', {
        value: () => {
          return source.slice(node.start, node.end)
        },
        writable: true,
        configurable: true,
        enumerable: false,
      })

      return func
    }
  }

  // new Ctrl()
  newExpressionHandler(node) {
    const source = this.source
    const expression = this.createClosure(node.callee)
    const args = node.arguments.map(arg => this.createClosure(arg))
    return () => {
      const construct = expression()
      if (!isFunction(construct) || construct.__IS_EVAL_FUNC) {
        const callee = node.callee
        const name = source.slice(callee.start, callee.end)
        throw this.createInternalThrowError(Messages.IsNotConstructor, name, node)
      }
      // new Function(...)
      if (construct.__IS_FUNCTION_FUNC) {
        return construct(new InternalInterpreterReflection(this), ...args.map(arg => arg()))
      }
      return new construct(...args.map(arg => arg()))
    }
  }

  // a.b a['b']
  memberExpressionHandler(node) {
    const objectGetter = this.createClosure(node.object)
    const keyGetter = this.createMemberKeyGetter(node)
    return () => {
      const obj = objectGetter()
      let key = keyGetter()

      if (key==='prototype' || key==='__proto__') {
        if (this.isBuiltInObject(obj)) {
          throw this.createInternalThrowError(Messages.BuiltInPrototypeChangeError, obj.constructor.name, node)
        }
      }

      // Prevent access to Function
      if (key==='constructor' && obj[key]===Function) {
        return (...args) => {
          return internalFunction(new InternalInterpreterReflection(this), ...args)
        }
      }

      return obj[key]
    }
  }

  //this
  thisExpressionHandler(node) {
    return () => this.getCurrentContext()
  }

  // var1,var2,...
  sequenceExpressionHandler(node) {
    const expressions = node.expressions.map(item => this.createClosure(item))
    return () => {
      let result
      const len = expressions.length
      for (let i = 0; i < len; i++) {
        const expression = expressions[i]
        result = expression()
      }
      return result
    }
  }

  // 1 'name'
  literalHandler(node) {
    return () => {
      if (node.regex) {
        return new RegExp(node.regex.pattern, node.regex.flags)
      }
      return node.value
    }
  }

  // var1 ...
  identifierHandler(node) {
    return () => {
      const currentScope = this.getCurrentScope()
      const data = this.getScopeDataFromName(node.name, currentScope)
      this.assertVariable(data, node.name, node)
      return data[node.name]
    }
  }

  getIdentifierScope(node) {
    const currentScope = this.getCurrentScope()
    const scope = this.getScopeFromName(node.name, currentScope)
    return scope
  }

  // a=1 a+=2
  assignmentExpressionHandler(node) {
    // var s = function(){}
    // s.name === s
    if (
      node.left.type === 'Identifier' &&
        node.right.type === 'FunctionExpression' &&
        !node.right.id
    ) {
      node.right.id = {
        type: 'Identifier',
        name: node.left.name,
      }
    }

    const dataGetter = this.createLeftObjectGetter(node.left)
    const nameGetter = this.createNameGetter(node.left)
    const rightValueGetter = this.createClosure(node.right)


    return () => {
      // When dataGetter is executed, if it is determined const and
      // has been initialized, an error will be thrown
      const data = dataGetter()
      const name = nameGetter()
      let realName
      if (isSymbol(name)){
        realName = storeKey(name)
      } else {
        realName = name
      }
      if (realName==='__proto__') {
        return // Prevent modifying __proto__ altogether
      }
      const rightValue = rightValueGetter()
      if (node.operator !== '=') {
        // if a is undefined
        // a += 1
        this.assertVariable(data, name, node)
      }
      switch (node.operator) {
      case '=':
        if (isSymbol(name)){
          Object.defineProperty(data, realName, {
            value: rightValue,
            writable: true,
            enumerable: false,
            configurable: true,
          })
          return rightValue
        } else {
          return (data[realName] = rightValue)
        }
      case '+=':
        return (data[realName] += rightValue)
      case '-=':
        return (data[realName] -= rightValue)
      case '*=':
        return (data[realName] *= rightValue)
      case '**=':
        return (data[name] = Math.pow(data[name], rightValue))
      case '/=':
        return (data[realName] /= rightValue)
      case '%=':
        return (data[realName] %= rightValue)
      case '<<=':
        return (data[realName] <<= rightValue)
      case '>>=':
        return (data[realName] >>= rightValue)
      case '>>>=':
        return (data[realName] >>>= rightValue)
      case '&=':
        return (data[realName] &= rightValue)
      case '^=':
        return (data[realName] ^= rightValue)
      case '|=':
        return (data[realName] |= rightValue)
      default:
        throw this.createInternalThrowError(
          Messages.AssignmentExpressionSyntaxError,
          node.type,
          node
        )
      }
    }
  }

  // function test(){}
  functionDeclarationHandler(node) {
    if (node.id) {
      const functionClosure = this.functionExpressionHandler(node)
      Object.defineProperty(functionClosure, 'isFunctionDeclareClosure', {
        value: true,
        writable: false,
        configurable: false,
        enumerable: false,
      })
      this.funcDeclaration(node.id.name, functionClosure)
    }
    return () => {
      return EmptyStatementReturn
    }
  }

  getVariableName(node) {
    if (node.type === 'Identifier') {
      return node.name
    }
    else {
      throw this.createInternalThrowError(Messages.VariableTypeSyntaxError, node.type, node)
    }
  }

  detectVaiable(node, varName, blockVariables) {
    if (node.kind == 'var'){
      /**
       * If the scope declared by var already has a lexical scope variable with the same name, the declaration of this var needs to report an error:
       * Cannot redeclare block-scoped variable 'xxx'
       */
      if (this.collectDeclLex.some(_=>_[varName]) ){
        throw this.createInternalThrowError(Messages.RedeclareBlockScopeVariableError, node.type, node)
      }
      // If it is var, declare hoist
      this.varDeclaration(varName)
    } else {
      // If it is a let/const declaration, the variable name is added to
      // the top hash of the stack in a special queue collectDeclLex
      let stackTop = this.collectDeclLex[this.collectDeclLex.length - 1]
      // collectDeclLex is mainly used to collect block variables during the
      // compilation phase. If a variable is dynamically declared during the
      // execution phase, then collectDeclLex will be an empty array, so judge
      stackTop && (stackTop[varName] = {
        init: false,
        kind: node.kind
      })
      blockVariables.push(varName)
    }
  }

  // var i;
  // var i=1;
  variableDeclarationHandler(node) {
    let assignmentsClosure
    const assignments = []
    let blockVariables = []

    for (let i = 0; i < node.declarations.length; i++) {
      const decl = node.declarations[i]
      if (decl.id.type == 'ObjectPattern') {
        if (!decl.init) {
          throw this.createInternalThrowError(Messages.SpreadPatternVariableNoInit, '', node)
        }

        // let {name, ...rest} = obj

        // Declares multiple variables
        let properties = decl.id.properties
        let alreadyVars = []
        properties.forEach(item=>{
          if (item.type === 'Property') {
            let varName = this.getVariableName(item.value)
            alreadyVars.push(varName)
            // Check whether the block variable
            this.detectVaiable(node, varName, blockVariables)
            assignments.push({
              type: 'ObjectPatternAssignExpression',
              left: item.value,
              right: decl.init,
            })
          } else if (item.type === 'RestElement') {
            let varName = item.argument.name
            this.detectVaiable(node, varName, blockVariables)
            assignments.push({
              type: 'ObjectPatternAssignExpression',
              // @ts-ignore
              left: item.argument,
              right: decl.init,
              rest: alreadyVars,
            })
          } else {
            throw this.createInternalThrowError(Messages.UnknownVariableDeclTypeError, '', node)
          }
        })

      } else if (decl.id.type == 'ArrayPattern') {

        // let [first, ...rest] = arr;

        if (!decl.init) {
          throw this.createInternalThrowError(Messages.SpreadPatternVariableNoInit, '', node)
        }
        let elements = decl.id.elements
        let alreadyVars = []

        elements.forEach((item, arr_ind)=>{
          if (item.type === 'Identifier'){
            let varName = item.name
            alreadyVars.push(varName)
            // Check whether the block variable
            this.detectVaiable(node, varName, blockVariables)
            assignments.push({
              type: 'ObjectPatternAssignExpression',
              left: item,
              right: decl.init,
              index: arr_ind,
            })
          } else if (item.type === 'RestElement') {
            let varName = item.argument.name
            this.detectVaiable(node, varName, blockVariables)
            assignments.push({
              type: 'ObjectPatternAssignExpression',
              left: item.argument,
              right: decl.init,
              index: arr_ind,
              arrRest: true,
            })
          } else {
            throw this.createInternalThrowError(Messages.UnknownVariableDeclTypeError, '', node)
          }
        })
      } else {
        let variableName = this.getVariableName(decl.id)
        this.detectVaiable(node, variableName, blockVariables)

        // In some cases, declarations lower than const will not have init, such as
        // for(const i in arr){}

        // We do not do strong verification here. The actively declared const must be
        // initialized. Acorn has verification before generating ast. Let's trust acorn.
        // In addition, even if it is not initialized here, the assignment of const
        // afterwards will report an error, so it will not have much impact.

        // if (node.kind == 'const' && !decl.init){
        //     throw this.createInternalThrowError(Messages.ConstNotInitError, variableName, node)
        // }
        if (decl.init) {
          assignments.push({
            type: 'AssignmentExpression',
            operator: '=',
            left: decl.id,
            right: decl.init,
          })
        }
      }
    }

    if (assignments.length) {
      assignmentsClosure = this.createClosure({
        type: 'GroupStatement',
        body: assignments,
      })
    }

    return () => {
      if (assignmentsClosure) {
        if (blockVariables.length) {
          let scope = this.getCurrentScope()
          // Confirm to initialize block-level variables
          blockVariables.forEach(name=>{

            if (scope.lexDeclared[name].kind === 'const') {

              // For const variables, we only set init to true when the
              // copy is running. After init is set to true, all subsequent
              // lvalue accesses to the variable will report an error

            } else if (scope.lexDeclared[name].kind === 'let') {
              // For let variables, set init is to true regardless of timing
              scope.lexDeclared[name].init = true
            }
          })
        }
        const oldValue = this.isVarDeclMode
        this.isVarDeclMode = true
        assignmentsClosure()
        // console.info('oldvalue is ', oldValue)
        this.isVarDeclMode = oldValue
      }

      return EmptyStatementReturn
    }
  }

  assertVariable(data, name, node) {
    if (data === this.globalScope.data && !(name in data)) {
      throw this.createInternalThrowError(Messages.VariableUndefinedReferenceError, name, node)
    }
  }

  // {...}
  programHandler(node) {

    // const currentScope = this.getCurrentScope();

    // Record the declarations of all lexical variables in the current block-level scope
    this.blockDeclareStart()

    // When the handler of the block-level scope is initialized, it will traverse
    // all the lower-level bodies, create a closure, and complete the variable declaration
    // hoist operation when the closure is created.

    let stmtClosures = node.body.map((stmt) => {
      // if (stmt.type === 'EmptyStatement') return null;
      return this.createClosure(stmt)
    })
    let functionDecl = node.body.map((_, index) =>
      ({ type: _.type, index })).filter(_=>_.type == 'FunctionDeclaration'
    )
    // Stores a list of block-level scoped variables
    let lexDeclared = this.blockDeclareEnd()

    return () => {
      let result = EmptyStatementReturn
      let prevScope
      let newScope
      if (lexDeclared){
        newScope = createScope(this.getCurrentScope(), `BScope`, 'block')
        newScope.lexDeclared = lexDeclared
        prevScope = this.entryBlockScope(newScope)
      }
      // If there is a function declaration, execute the function declaration first:
      functionDecl.forEach(_=>{
        stmtClosures[_.index]()
        stmtClosures[_.index] = null
      })
      stmtClosures = stmtClosures.filter(_ => _)

      for (let i = 0; i < stmtClosures.length; i++) {
        const stmtClosure = stmtClosures[i]

        // save last value
        const ret = this.setValue(stmtClosure())

        // if (!stmtClosure) continue;
        // EmptyStatement
        if (ret === EmptyStatementReturn) continue

        result = ret

        // BlockStatement: break label;  continue label; for(){ break ... }
        // ReturnStatement: return xx;
        if (
          result instanceof Return ||
                result instanceof BreakLabel ||
                result instanceof ContinueLabel ||
                result === Break ||
                result === Continue
        ) {
          break
        }
      }
      // Restore scope
      if (lexDeclared){
        this.setCurrentScope(prevScope)
      }
      // Save last value
      return result
    }
  }

  // all expression: a+1 a&&b a() a.b ...
  expressionStatementHandler(node) {
    return this.createClosure(node.expression)
  }

  emptyStatementHandler(node) {
    return () => EmptyStatementReturn
  }

  // return xx;
  returnStatementHandler(node) {
    const argumentClosure = node.argument ? this.createClosure(node.argument) : noop
    return () => new Return(argumentClosure())
  }

  // if else
  ifStatementHandler(node) {
    const testClosure = this.createClosure(node.test)
    const consequentClosure = this.createClosure(node.consequent)
    const alternateClosure = node.alternate
      ? this.createClosure(node.alternate)
      : /*!important*/ () => EmptyStatementReturn
    return () => {
      return testClosure() ? consequentClosure() : alternateClosure()
    }
  }

  // test() ? true : false
  conditionalExpressionHandler(node) {
    return this.ifStatementHandler(node)
  }

  // for(var i = 0; i < 10; i++) {...}
  forStatementHandler(node) {
    let initClosure = noop
    let testClosure = node.test ? this.createClosure(node.test) : () => true
    let updateClosure = noop
    let initLexDeclared
    let getBodyClosure = () => {
      if (node.body.type == 'BlockStatement') {
        // node.body is a blockStatement, here we don't need to do anything
        // to check the block scope.
        return {
          needBlock: null,
          closure: this.createClosure(node.body)
        }
      } else {
        this.blockDeclareStart()
        let closure = this.createClosure(node.body)
        let bodyLex = this.blockDeclareEnd()
        return {
          needBlock: bodyLex,
          closure,
        }
      }
    }
    if (node.type === 'ForStatement') {
      if (node.init) {
        this.blockDeclareStart()
        initClosure = this.createClosure(node.init)
        initLexDeclared = this.blockDeclareEnd()
      }
      updateClosure = node.update ? this.createClosure(node.update) : noop
    } else {
      // while, do-while
    }

    return pNode => {
      let labelName
      let result = EmptyStatementReturn
      let shouldInitExec = node.type === 'DoWhileStatement'

      if (pNode && pNode.type === 'LabeledStatement') {
        labelName = pNode.label.name
      }
      let prevScope
      let newScope
      if (initLexDeclared) {
        newScope = createScope(this.getCurrentScope(), `BScope(for-let)`, 'block')
        newScope.lexDeclared = initLexDeclared
        prevScope = this.entryBlockScope(newScope)
      }
      for (initClosure(); shouldInitExec || testClosure(); updateClosure()) {
        shouldInitExec = false

        let bodyClosure = getBodyClosure()
        let bodyPrev
        let bodyScope
        if (bodyClosure.needBlock) {
          bodyScope = createScope(this.getCurrentScope(), `BScope(for-body)`, 'block')
          bodyScope.lexDeclared = bodyClosure.needBlock
          bodyPrev = this.entryBlockScope(bodyScope)
        }
        // save last value
        const ret = this.setValue(bodyClosure.closure())
        // Restore scope
        if (bodyClosure.needBlock) {
          this.setCurrentScope(bodyPrev)
        }
        // notice: never return Break or Continue!
        if (ret === EmptyStatementReturn || ret === Continue) continue
        if (ret === Break) {
          break
        }

        result = ret

        // stop continue label
        if (result instanceof ContinueLabel && result.value === labelName) {
          result = EmptyStatementReturn
          continue
        }

        if (
          result instanceof Return ||
                result instanceof BreakLabel ||
                result instanceof ContinueLabel
        ) {
          break
        }
      }
      if (initLexDeclared) {
        this.setCurrentScope(prevScope)
      }
      return result
    }
  }

  // while(1) {...}
  whileStatementHandler(node) {
    return this.forStatementHandler(node)
  }

  doWhileStatementHandler(node) {
    return this.forStatementHandler(node)
  }

  forInStatementHandler(node) {
    // for( k in obj) or for(o.k in obj) ...
    let left = node.left
    const rightClosure = this.createClosure(node.right)
    const bodyClosure = this.createClosure(node.body)
    // for(var k in obj) {...}
    if (node.left.type === 'VariableDeclaration') {
      // init var k
      this.createClosure(node.left)()
      // reset left
      // for( k in obj)
      left = node.left.declarations[0].id
    }
    return pNode => {
      let labelName
      let result = EmptyStatementReturn
      let x
      if (pNode && pNode.type === 'LabeledStatement') {
        labelName = pNode.label.name
      }
      const data = rightClosure()
      for (x in data) {
        // assign left to scope
        // k = x
        // o.k = x
        this.assignmentExpressionHandler({
          type: 'AssignmentExpression',
          operator: '=',
          left: left,
          right: {
            type: 'Literal',
            value: x,
          },
        })()
        // save last value
        const ret = this.setValue(bodyClosure())
        // notice: never return Break or Continue!
        if (ret === EmptyStatementReturn || ret === Continue)
          continue
        if (ret === Break) {
          break
        }
        result = ret
        // stop continue label
        if (result instanceof ContinueLabel && result.value === labelName) {
          result = EmptyStatementReturn
          continue
        }
        if (result instanceof Return ||
                    result instanceof BreakLabel ||
                    result instanceof ContinueLabel) {
          break
        }
      }
      return result
    }
  }

  withStatementHandler(node) {
    const objectClosure = this.createClosure(node.object)
    const bodyClosure = this.createClosure(node.body)
    return () => {
      const data = objectClosure()
      const currentScope = this.getCurrentScope()
      const newScope = new Scope(data, currentScope, WithScopeName)
      // const data = objectClosure();
      // copy all properties
      // for (let k in data) {
      //   newScope.data[k] = data[k];
      // }
      this.setCurrentScope(newScope)
      // save last value
      const result = this.setValue(bodyClosure())
      this.setCurrentScope(currentScope)
      return result
    }
  }

  throwStatementHandler(node) {
    const argumentClosure = this.createClosure(node.argument)
    return () => {
      this.setValue(undefined)
      throw argumentClosure()
    }
  }

  // try{...}catch(e){...}finally{}
  tryStatementHandler(node) {
    const blockClosure = this.createClosure(node.block)
    const handlerClosure = node.handler ? this.catchClauseHandler(node.handler) : null
    const finalizerClosure = node.finalizer ? this.createClosure(node.finalizer) : null
    return () => {
      const currentScope = this.getCurrentScope()
      const currentContext = this.getCurrentContext()
      const labelStack = currentScope.labelStack.concat([])
      const callStack = this.callStack.concat([])
      let result = EmptyStatementReturn
      let finalReturn
      let throwError
      const reset = () => {
        this.setCurrentScope(currentScope) //reset scope
        this.setCurrentContext(currentContext) //reset context
        currentScope.labelStack = labelStack //reset label stack
        this.callStack = callStack //reset call stack
      }
      /**
             * try{...}catch(e){...}finally{...} execution sequence:
             * try stmt
             * try throw
             * catch stmt (if)
             * finally stmt
             *
             * finally throw or finally return
             * catch throw or catch return
             * try return
             */
      try {
        result = this.setValue(blockClosure())
        if (result instanceof Return) {
          finalReturn = result
        }
      }
      catch (err) {
        reset()
        if (this.isInterruptThrow(err)) {
          throw err
        }
        if (handlerClosure) {
          try {
            result = this.setValue(handlerClosure(err))
            if (result instanceof Return) {
              finalReturn = result
            }
          }
          catch (err) {
            reset()
            if (this.isInterruptThrow(err)) {
              throw err
            }
            // save catch throw error
            throwError = err
          }
        }
      }
      // finally {
      if (finalizerClosure) {
        try {
          //do not save finally result
          result = finalizerClosure()
          if (result instanceof Return) {
            finalReturn = result
          }
          // finalReturn = finalizerClosure();
        }
        catch (err) {
          reset()
          if (this.isInterruptThrow(err)) {
            throw err
          }
          // save finally throw error
          throwError = err
        }
        // if (finalReturn instanceof Return) {
        //   result = finalReturn;
        // }
      }
      // }
      if (throwError)
        throw throwError
      if (finalReturn) {
        return finalReturn
      }
      return result
    }
  }

  // ... catch(e){...}
  catchClauseHandler(node) {
    const paramNameGetter = this.createParamNameGetter(node.param)
    const bodyClosure = this.createClosure(node.body)
    return (e) => {
      let result
      const currentScope = this.getCurrentScope()
      const scopeData = currentScope.data
      // get param name 'e'
      const paramName = paramNameGetter()
      const isInScope = hasOwnProperty.call(scopeData, paramName) //paramName in scopeData;
      // save 'e'
      const oldValue = scopeData[paramName]
      // add 'e' to scope
      scopeData[paramName] = e
      // run
      result = bodyClosure()
      // reset 'e'
      if (isInScope) {
        scopeData[paramName] = oldValue
      }
      else {
        //unset
        delete scopeData[paramName]
      }
      return result
    }
  }

  continueStatementHandler(node) {
    return () => (node.label ? new ContinueLabel(node.label.name) : Continue)
  }

  breakStatementHandler(node) {
    return () => (node.label ? new BreakLabel(node.label.name) : Break)
  }

  switchStatementHandler(node) {
    const discriminantClosure = this.createClosure(node.discriminant)
    const caseClosures = node.cases.map(item => this.switchCaseHandler(item))
    return () => {
      const value = discriminantClosure()
      let match = false
      let result
      let ret, defaultCase
      for (let i = 0; i < caseClosures.length; i++) {
        const item = caseClosures[i]()
        const test = item.testClosure()
        if (test === DefaultCase) {
          defaultCase = item
          continue
        }
        if (match || test === value) {
          match = true
          ret = this.setValue(item.bodyClosure())
          // notice: never return Break!
          if (ret === EmptyStatementReturn)
            continue
          if (ret === Break) {
            break
          }
          result = ret
          if (result instanceof Return ||
                        result instanceof BreakLabel ||
                        result instanceof ContinueLabel ||
                        result === Continue) {
            break
          }
        }
      }
      if (!match && defaultCase) {
        ret = this.setValue(defaultCase.bodyClosure())
        const isEBC = ret === EmptyStatementReturn || ret === Break || ret === Continue
        // notice: never return Break or Continue!
        if (!isEBC) {
          result = ret
        }
      }
      return result
    }
  }

  switchCaseHandler(node) {
    const testClosure = node.test ? this.createClosure(node.test) : () => DefaultCase
    const bodyClosure = this.createClosure({
      type: 'BlockStatement',
      body: node.consequent,
    })
    return () => ({
      testClosure,
      bodyClosure,
    })
  }

  // label: xxx
  labeledStatementHandler(node) {
    const labelName = node.label.name
    const bodyClosure = this.createClosure(node.body)
    return () => {
      let result
      const currentScope = this.getCurrentScope()
      currentScope.labelStack.push(labelName)
      result = bodyClosure(node)
      // stop break label
      if (result instanceof BreakLabel && result.value === labelName) {
        result = EmptyStatementReturn
      }
      currentScope.labelStack.pop()
      return result
    }
  }

  debuggerStatementHandler(node) {
    return () => {
      debugger // eslint-disable-line no-debugger
      return EmptyStatementReturn
    }
  }

  // {...} However, when blockScope is not generated, and multiple expressions are
  // assembled and executed together, a data structure of this intermediate form is used,
  // which is only used internally by the compiler
  groupStatementHandler(node) {

    // const currentScope = this.getCurrentScope();

    // When the handler of the block-level scope is initialized, it will traverse
    // all the lower-level bodies, create a closure, and complete the variable declaration
    // hoist operation when the closure is created.
    const stmtClosures = (node.body).map((stmt) => {
      // if (stmt.type === 'EmptyStatement') return null;
      return this.createClosure(stmt)
    })

    return () => {
      let result = EmptyStatementReturn
      let prevScope
      let newScope
      for (let i = 0; i < stmtClosures.length; i++) {
        const stmtClosure = stmtClosures[i]

        // save last value
        const ret = this.setValue(stmtClosure())

        // if (!stmtClosure) continue;
        // EmptyStatement
        if (ret === EmptyStatementReturn) continue

        result = ret

        // BlockStatement: break label;  continue label; for(){ break ... }
        // ReturnStatement: return xx;
        if (
          result instanceof Return ||
                result instanceof BreakLabel ||
                result instanceof ContinueLabel ||
                result === Break ||
                result === Continue
        ) {
          break
        }
      }
      // save last value
      return result
    }
  }

  // `hello ${estime}, test`
  templateLiteralHandler(node) {
    let vasGetters = node.expressions.map(_=>this.createClosure(_))
    let strs = node.quasis.map(_=>({
      value: _.value,
      tail: _.tail,
    }))

    return ()=>{
      let str = ''
      for(let i=0;i<strs.length;i++) {
        // use cooked or raw??
        str += (strs[i].value.cooked + (strs[i].tail ? '' : this.getString(vasGetters[i]())))
      }
      return str
    }
  }

  // (...args)
  spreadElementHandler(node) {
    let closure = this.createClosure(node.argument)
    return () => {
      const data = closure()
      const MArray = this.globalScope.data['Array']
      if(!Array.isArray(data)){
        throw this.createInternalThrowError(Messages.NormalError, `spread node type not array`, node)
      }
      return data
    }
  }

  classDeclarationHandler(node) {
    let className
    let classClosure
    // The scope of the class is the block-level scope
    if (node.id) {
      classClosure = this.classExpressionHandler(node)
      let stackTop = this.collectDeclLex[this.collectDeclLex.length - 1]
      stackTop && (stackTop[node.id.name] = {
        init: false,
        kind: 'let'
      })
      className = node.id.name
    }
    return () => {
      const closure = classClosure()
      if (className) {
        let scope = this.getCurrentScope()
        scope.lexDeclared[className].init = true
        scope.data[className] = closure
      }
      return closure // EmptyStatementReturn
    }
  }

  classExpressionHandler(node) {

    const className = node.id ? node.id.name : "" /**anonymous*/

    let classDecl = {
      // cons?: BaseClosure
      // We treat static properties equally, whether they are properties or methods.
      // Just assign it directly to the class.
      static: [],
      // Some methods on the instance this. If these methods are arrow functions,
      // they need to be self-bound; if they are general functions, they don’t need
      // to be self-bound.
      fieldsArrow: [], // seeyouagain[]
      // General attributes placed on the instance this
      fieldsProperty: [], // seeyouagain[]
      // Instance method on prototype
      method: [], // seeyouagain[]
    }

    let superClass = node.superClass ? this.createClosure(node.superClass) : null

    node.body.body.forEach(item=>{
      if(item.type === 'MethodDefinition'){
        // Focus on these attributes: kind/static/computed
        if(item.kind === 'constructor'){
          classDecl.cons = this.createClosure(item.value)
        } else if(item.kind === 'method') {
          classDecl[item.static?'static':'method'].push({
            name: {
              computed: item.computed,
              value: item.computed?this.createClosure(item.key):item.key.name
            },
            value: this.createClosure(item.value)
          })
        } else if(item.kind === 'get' || item.kind === 'set') {
          // The setter and getter of the class are not supported
          throw this.createInternalThrowError(Messages.NormalError, 'not support getter and setter in class', node)
        }
      } else if(item.type === 'FieldDefinition' || item.type === 'PropertyDefinition') {

        // Follow static/computed
        if (item.static) {
          classDecl.static.push({
            name: {
              computed: item.computed,
              // @ts-ignore
              value: item.computed?this.createClosure(item.key):item.key.name
            },
            value: this.createClosure(item.value)
          })
        } else {
          // If it is an arrow function, special self-binding is required, and the
          // rest (attributes or function functions) do not need to be processed
          let t = item.value.type == 'ArrowFunctionExpression'
            ? 'fieldsArrow'
            : 'fieldsProperty'

          classDecl[t].push({
            name: {
              computed: item.computed,
              // @ts-ignore
              value: item.computed?this.createClosure(item.key):item.key.name
            },
            value: this.createClosure(item.value)
          })
        }
      } else {
        throw this.createInternalThrowError(Messages.NormalError, 'unknown class body type '+item.type, node.body)
      }
    })


    return () => {
      let self = this
      let _super = superClass ? superClass() : null
      let cons
      // If there is a parent class and there is a displayed constructor declaration,
      // the super variable should be injected when constructing the constructor
      if(_super && classDecl.cons){
        let newScope = createScope(this.getCurrentScope(), `FScope(constructor)`, 'block')
        newScope.lexDeclared = {
          super: {
            kind: 'const',
            init: true
          }
        }
        newScope.data['super'] = _super
        let prevScope = this.entryBlockScope(newScope)
        cons = classDecl.cons()
        this.setCurrentScope(prevScope)
      }else{
        cons = classDecl.cons?classDecl.cons():null
      }

      let func = function(){
        let _this = this
        if(superClass && !cons){
          _this = _super.call(_this) || _this
        }
        // Bind the field attribute first, and then execute the constructor
        classDecl.fieldsArrow.forEach(item=>{
          let prev = self.getCurrentContext()
          self.setCurrentContext(_this)
          let fn = item.value()
          self.setCurrentContext(prev)
          setKeyVal(_this, item, fn)
          // _this[item.name.computed?(item.name.value )():item.name.value] = fn
        })

        classDecl.fieldsProperty.forEach(item=>{
          setKeyVal(_this, item, item.value())
          // _this[item.name.computed?(item.name.value )():item.name.value] = item.value()
        })
        if(cons){
          cons.apply(_this, arguments)
        }
        return _this
      }

      superClass && __extend(func, _super)

      classDecl.method.forEach(item=>{
        func.prototype[item.name.computed?(item.name.value )():item.name.value] = item.value()
      })

      classDecl.static.forEach(item=>{
        func[item.name.computed?(item.name.value )():item.name.value] = item.value()
      })

      if (className) {
        Object.defineProperty(func, "name", {
          value: className,
          writable: false,
          enumerable: false,
          configurable: true,
        })
      }

      return func
    }
  }

  superHandler(node) {
    return () => {
      const currentScope = this.getCurrentScope()
      const data = this.getScopeDataFromName('super', currentScope)
      // TODO: In fact, you have to verify whether it is your own super, because the
      // scope chain looks up, and you may find super variables that are completely unrelated
      // to your superiors. There are not many cases in which you can temporarily postpone
      // the repair.
      this.assertVariable(data, 'super', node)
      return data['super']
    }
  }

  // ===================== Utilities =====================

  // get es3/5 param name
  createParamNameGetter(node) {
    if (node.type === "Identifier") {
      return () => node.name
    } else if (node.type === 'RestElement') {
      return this.createParamNameGetter(node.argument)
    } else {
      throw this.createInternalThrowError(Messages.ParamTypeSyntaxError, node.type, node)
    }
  }

  createObjectKeyGetter(node) {
    let getter
    // var obj = { title: '' }
    if (node.type === 'Identifier') {
      getter = () => node.name
    }
    else {
      // Literal or ...
      // var obj = { 'title': '' } or others...
      getter = this.createClosure(node)
    }
    return function () {
      return getter()
    }
  }

  createMemberKeyGetter(node) {
    // s['a'];  node.computed = true
    // s.foo;  node.computed = false
    return node.computed
      ? this.createClosure(node.property)
      : this.createObjectKeyGetter(node.property)
  }

  createLeftObjectGetter(node) {
    switch (node.type) {
    case 'Identifier':
      return () => {
        let name = node.name
        let scope = this.getScopeFromName(name, this.getCurrentScope(), true)
        if (scope.lexDeclared && scope.lexDeclared[name] && scope.lexDeclared[name].kind == 'const') {
          if (scope.lexDeclared[name].init === false) {
            scope.lexDeclared[name].init = true
          } else {
            // console.info('node ====> ', node, scope)
            throw this.createInternalThrowError(
              Messages.ConstChangeError,
              name,
              node
            )
          }
        }
        return scope.data
      }
    case 'MemberExpression':
      return this.createClosure(node.object)
    default:
      throw this.createInternalThrowError(
        Messages.AssignmentTypeSyntaxError,
        node.type,
        node
      )
    }
  }


  // for UnaryExpression UpdateExpression AssignmentExpression
  createObjectGetter(node) {
    switch (node.type) {
    case 'Identifier':
      return () => this.getScopeDataFromName(node.name, this.getCurrentScope())
    case 'MemberExpression':
      return this.createClosure(node.object)
    default:
      throw this.createInternalThrowError(Messages.AssignmentTypeSyntaxError, node.type, node)
    }
  }

  // for UnaryExpression UpdateExpression AssignmentExpression
  createNameGetter(node) {
    switch (node.type) {
    case 'Identifier':
      return () => node.name
    case 'MemberExpression':
      return this.createMemberKeyGetter(node)
    default:
      throw this.createInternalThrowError(Messages.AssignmentTypeSyntaxError, node.type, node)
    }
  }

  getString(val) {
    if (typeof val === 'string') {
      return val
    } else if (typeof val.toString === 'function') {
      return val.toString()
    } else {
      return Object.prototype.toString.call(val)
    }
  }

  varDeclaration(name) {
    const context = this.collectDeclVars
    context[name] = undefined
  }

  funcDeclaration(name, func) {
    const context = this.collectDeclFuncs
    context[name] = func
  }

  addDeclarationsToScope(declVars, declFuncs, scope) {
    const scopeData = scope.data
    for (let key in declFuncs) {
      const value = declFuncs[key]
      scopeData[key] = value ? value() : value
    }
    for (let key in declVars) {
      if (!(key in scopeData)) {
        scopeData[key] = void 0
      }
    }
  }

  getScopeValue(name, startScope) {
    const scope = this.getScopeFromName(name, startScope)
    return scope.data[name]
  }

  getScopeDataFromName(name, startScope) {
    return this.getScopeFromName(name, startScope).data
  }

  getScopeFromName(name, startScope, constInit = true) {

    let scope = startScope

    do {
      if (scope.type == 'block') {
        if (!scope.lexDeclared[name]) {
          // It stands to reason that all variables on a blockscope are marked
          // in lexDeclared, and there are exceptions.
          // For example, in catch(e){}, the variable e will be inserted at zero time,
          // and there will be no mark on lexDeclared
          if (name in scope.data) {
            return scope
          }
          // Otherwise look up
        } else {
          if (scope.lexDeclared[name].init === false) {
            if (constInit && scope.lexDeclared[name].kind == 'const') {
              // When the const variable is initialized, the check bit has not been
              // set to true, let it go
              return scope
            }
            throw this.createInternalThrowError(
              Messages.LetVariableUseBeforeInitReferenceError,
              name,
            )
          } else if (scope.lexDeclared[name].init === true) {
            return scope
          }
          // Otherwise look up
        }
      } else {
        // function scope
        // Function-level scope may also have lexDeclared
        if (scope.lexDeclared && scope.lexDeclared[name] && scope.lexDeclared[name].init === false) {
          throw this.createInternalThrowError(
            Messages.LetVariableUseBeforeInitReferenceError,
            name
          )
        }
        if (name in scope.data) {
          //if (hasOwnProperty.call(scope.data, name)) {
          return scope
        }
        // Otherwise look up
      }
    } while ((scope = scope.parent))

    return this.globalScope
  }

  entryBlockScope(newScope) {
    const prevScope = this.getCurrentScope()
    // When the function is executed, a new scope is created, and the next line
    // points the running pointer of the program to the new scope
    this.setCurrentScope(newScope)
    // blockScope does not need to assign new hoist variables
    // self.addDeclarationsToScope(declVars, declFuncs, currentScope);
    return prevScope
  }

  setValue(value) {
    const isFunctionCall = this.callStack.length
    if (this.isVarDeclMode ||
            isFunctionCall ||
            value === EmptyStatementReturn ||
            value === Break ||
            value === Continue ||
            value instanceof BreakLabel ||
            value instanceof ContinueLabel) {
      return value
    }
    this.value = value instanceof Return ? value.value : value
    return value
  }

  getValue() {
    if (this.value===globalOrWindow) return // Prevent access to global
    return this.value
  }
}

Interpreter.version = version
Interpreter.eval = internalEval
Interpreter.Function = internalFunction
Interpreter.ecmaVersion = 'latest' // 5
Interpreter.globalContextInFunction = void 0
Interpreter.global = Object.create(null)

module.exports = {
  Interpreter
}