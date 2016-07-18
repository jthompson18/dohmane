import CacheWorker from '../worker'
import { models } from './models'
import { getters } from './getters'

new CacheWorker(models, getters, {TEST_STORE: 'Cache'})
