import Cache from './cache'
import CacheWorker from './worker/worker'
import WorkerProxy from './worker/proxy'

/**
 * The index provides `Cache` for working in the window context, and
 * `CacheWorker` and `WorkerProxy` for working in a WebWorker context
 * and communicating with that worker, respectively.
 * @type {Object}
 */
export var cache = {
  Cache: Cache,
  CacheWorker: CacheWorker,
  WorkerProxy: WorkerProxy
}
