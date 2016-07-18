/**
 * The `WorkerProxy` wraps a WebWorker's `postMessage` API
 * with the promise-returning `dispatch` method and  provides `on` and `off`
 * subscription methods with semantics like `Nuclear.Reactor#observe`
 */
export default class WorkerProxy {
  /**
   * @param  {WebWorker} worker - A web worker instance.
   * @param  {bool} debug - Whether this should log all messages.
   * @returns {null}
   */
  constructor(worker, debug) {
    this.worker = worker
    this.debug = debug
    this.handlers = {}
    worker.onmessage = this.onMessage.bind(this)
  }
  /**
   * Handle a message from this worker.
   * All handlers for an action will be called.
   * @param  {Any} data - An argument forwarded to each handler in turn.
   * @returns {null}
   */
  onMessage({data}) {
    let [action, params] = data
    let handlers = this.handlers[action]
    if (this.debug) {
      console.info('worker message: ', action, params, handlers)
    }
    if (handlers && handlers.length) {
      handlers.forEach(handler => handler(params))
    }
  }
  /**
   * Register a callback for an action from this worker.
   * @param  {String} action - A name which, when received in a message from the web worker, should fire the handler.
   * @param  {Function} handler - A callback, taking a single argument.
   * @returns {Function} Call the return value of `on` to unsubscribe the provided handler.
   */
  on(action, handler) {
    // TODO: type checking
    let handlers = this.handlers[action] || []
    handlers.push(handler)
    this.handlers[action] = handlers
    return () => this.off(action, handler)
  }
  /**
   * Remove a callback from the handle subscriptions.
   * @param  {string} action - The action to unsubscribe from.
   * @param  {Function} handler - The callback you want to remove.
   * @returns {null}
   */
  off(action, handler) {
    if (!action) {
      this.handlers = {}
      return
    }
    if (!handler && handler !== false) {
      this.handlers[action] = []
      return
    }
    let handlers = this.handlers[action] || []
    this.handlers[action] = handlers.filter((h) => h !== handler)
  }
  /**
   * Dispatch an action to the WebWorker.
   * Returns a promise when the expected action type is received.
   * @param  {String} action - The action you want to send to the worker.
   * @param  {Any} params - The single argument, typically an object, to pass to the callback on the worker.
   * @param  {String|null} expects - The action you want to resolve the promise on, if it differs from `action`.
   * @returns {Promise} Resolves with the payload from the web worker's message.
   */
  dispatch(action, params, expects) {
    return new Promise((resolve, reject) => {
      this.worker.postMessage([action, params])
      let off = this.on(expects || action, (data) => {
        off()
        return resolve(data)
      })
    })
  }
}
