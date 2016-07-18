import { Reactor } from 'nuclear-js'
import Cache from '../cache'
import { forEach } from 'lodash/collection'
import { values } from 'lodash/object'
import { isFunction } from 'lodash/lang'


/**
 * The `CacheWorker` class spins up a new Reactor and hooks
 * it up to the parent worker's `onmessage` handler.
 *
 * `self` refers to the WebWorker's global context; this class
 * must be instantiated by a WebWorker.
 */
export default class CacheWorker {
  /**
   * @param  {Object{String, Model}} models - A map of the models to register on each store.
   * @param  {Object{String, Getter}} getters - A map of the getters to make available for bindings.
   * @param  {Array[String]} defaultStores - A list of store names to register on init, against the default namespace.
   * @param  {Array[String]} defaultNamespaces - The namespaces to register the default stores against.
   * @param  {Object[String, Store]|null} storeTypes - An optional override of the available store types.
   * @returns {null}
   */
  constructor(models, getters, defaultStores, storeTypes) {
    this.models = models
    this.getters = getters
    this.storeInstances = {}
    this.bindings = {}
    this.storeTypes = storeTypes || {'Cache': Cache}
    this.Flux = new Reactor()
    self.onmessage = ({data}) => {
      let [action, params] = data
      if (!isFunction(this[action])) {
        throw new Error('No handler defined for message type ' + action)
      }
      let result = this[action](params)
      self.postMessage([action, result])
    }
    if (defaultStores) {
      forEach(defaultStores, (storeName, NS) => {
        this.registerStore({storeType: storeName, namespace: NS})
      })
    }
  }
  /**
   * Register a new store on this reactor.
   * Sends back the namespace and the namespaced action types.
   * @param  {String} storeType - The type of store to register.
   * @param  {String} namespace - The key to register the store with on this Reactor.
   * @returns {Object} The namespace and the actionTypes scoped to it.
   */
  registerStore({storeType, namespace}) {
    let Store = this.storeTypes[storeType]
    let store = this.storeInstances[namespace] = new Store(this.Flux, namespace, values(this.models))
    return {namespace: namespace, actionTypes: store.actionTypes}
  }
  /**
   * Dispatch any action to this reactor. Sends back the action name.
   * @param  {String} action - The name of the action to dispatch.
   * @param  {Any} params - The action payload.
   * @returns {String} The name of the action.
   */
  dispatch({action, params}) {
    this.Flux.dispatch(action, params)
    return action
  }
  /**
   * Observe a set of getters. The WebWorker API discourages sending functions,
   * so here you pass a map of keys (which will be echoed in change messages)
   * to the keys of getters in `this.getters`, rather than the getters themselves.
   *
   * Subscribers are responsible for unsubscribing when appropriate, which
   * you can do by dispatching `clearDataBindings` with the same namespace and
   * scope you passed to `getDataBindings`.
   * @param  {String} namespace - The namespace of the store to bind to.
   * @param  {String} scope - A key grouping the registered observers.
   * @param  {Object[String, String]} bindings - The getters to observe.
   * @returns {bool}
   */
  getDataBindings({namespace, scope, bindings}) {
    let nsBindings = this.bindings[namespace] = this.bindings[namespace] || {}
    let unwatchers = nsBindings[scope] || []
    while (unwatchers.length > 0) {
      unwatchers.pop()()
    }
    forEach(bindings, (getterKey, key) => {
      let getter = this.getters[getterKey]
      unwatchers.push(this.Flux.observe(getter, value => this.valueChanged({
        namespace: namespace,
        scope: scope,
        key: key,
        value: value.toJS()
      })))
    })
    return true
  }
  /**
   * Clear out the data bindings for a given namespace and scope.
   * Clear all scopes in a namespace by omitting `scope`.
   * @param  {String} namespace - The namespace to clear.
   * @param  {String|null} scope - The scope in the namespace to clear, or null for all scopes.
   * @returns {bool}
   */
  clearDataBindings({namespace, scope}) {
    if (!this.bindings[namespace]) {
      return
    }
    if (!scope) {
      forEach(this.bindings[namespace], (_, scope) => {
        this.clearDataBindings({namespace: namespace, scope: scope})
      })
      return true
    }
    let unwatch = this.bindings[namespace][scope]
    while (unwatch && unwatch.length) {
      unwatch.pop()()
    }
    return true
  }
  /**
   * Evaluate a simple key path against this Reactor.
   * You probably don't want to do this in production.
   * @param  {Array[String]} getter - A keypath (no functions).
   * @returns {Object} The evaluated POJO.
   */
  evaluate({getter}) {
    let params = this.Flux.evaluateToJS(getter)
    return params
  }
  /**
   * Reset this Reactor, and clear all observers.
   * @returns {bool}
   */
  reset() {
    this.Flux.reset()
    forEach(this.storeInstances, (store, namespace) => {
      this.clearDataBindings({namespace: namespace})
      this.Flux.dispatch(store.actionTypes.REGISTER_MODELS, values(this.models))
    })
    return true
  }
  /**
   * Ping this worker; echoes the message.
   * @param  {Any} params - Something to echo.
   * @returns {Any} Whatever you give it.
   */
  echo(params) {
    return params
  }
  /**
   * Post an observer update.
   * @param  {Any} params - The changed value.
   * @returns {null}
   */
  valueChanged(params) {
    self.postMessage(['valueChanged', params])
  }
}
