import { newCacheStore } from './stores/cache'
import { actionTypes } from './actionTypes'


/**
 * The `Cache` class instantiates a new record cache, under the namespace
 * you provide, and will register any models you pass to it.
 *
 * Namespaced actions are exposed on the cache instance.
 */
export default class Cache {
  /**
   * @param  {Nuclear.Reactor} Flux - The parent reactor.
   * @param  {String} namespace - This cache's namespace on the reactor.
   * @returns {null}
   */
  constructor(Flux, namespace, models) {
    this.namespace = namespace
    this.models = models
    this.actionTypes = actionTypes(namespace)

    Flux.registerStores({
      [namespace]: newCacheStore(this.actionTypes)
    })

    if (models) {
      Flux.dispatch(this.actionTypes.REGISTER_MODELS, models)
    }
  }
}
