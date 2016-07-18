import { Store, toImmutable, Immutable } from 'nuclear-js'

export function newCacheStore(actionTypes) {
  return new Store(
  {
    /**
     * Defines the initial state of the Cache store.
     *
     * This store keeps track of the initial and current values of all records in an application context.
     *
     * The top level of each maps entity type names to a map of entity instance keys to instances.
     * Your entity model is responsible for declaring the type name and how to get an instance's key.
     *
     * Every record has a type, and that type must be registered on this store. Models should
     * be registered once. Model declarations contain important bookkeeping metadata; you can
     * also use the model declaration in your application code to scope model-specific behavior.
     *
     * Keys are automatically assigned to new records in a series of decrementing negative numbers.
     * @returns {Immutable.Map}
     */
    getInitialState() {
      return toImmutable({
        /**
         * When objects are loaded into the cache, an entry is made in `initialValues.`
         * This entry does not change until the `currentValues` are accepted.
         * @type {Immutable.Map[String, Immutable.Map[String, Immutable.Map[String, any]]]}
         */
        initialValues: {},
        /**
         * When an object is loaded into the cache, an entry is also made in `currentValues,`
         * which is strictly equal to the entry in `initialValues`.
         * Edits applied to this object by the application are applied to the value for that
         * object in `currentValues` only.
         * New records are appended to the `currentValues` map but not the `initialValues` map.
         * @type {Immutable.Map[String, Immutable.Map[String, Immutable.Map[String, any]]]}
         */
        currentValues: {},
        /**
         * Model definitions are stored here.
         * @type {Immutable.Map[String, Model]}
         */
        models: {},
        /**
         * The `_inverseForeignKeyIndex` maps the primary key of entities that have
         * inverse foreign keys to the primary key of related objects.
         * @type {Immutable.Map[String, Immutable.Map[Number|String, Immutable.List[Number|String]]]}
         */
        _inverseForeignKeyIndex: {},
        /**
         * Objects can be marked deleted, while retaining their current values.
         * @type {Immutable.Map[String, Immutable.Set(String|Number)]}
         */
        deleted: {},
        /**
         * Assigned to new records, the `_nextKey` is decremented on each use.
         * @type {Number}
         */
        _nextKey: -1
      })
    },

    /**
     * Register action handlers in `initialize`.
     * @returns {None}
     */
    initialize() {
      this.on(actionTypes.REGISTER_MODELS, registerModels)
      this.on(actionTypes.LOAD_RECORDS, loadRecords)
      this.on(actionTypes.CREATE_RECORD, createRecord)
      this.on(actionTypes.ACCEPT_CHANGES, acceptChanges)
      this.on(actionTypes.SET_DELETED, setDeleted)
      this.on(actionTypes.UPDATE_RECORD, updateRecord)
      this.on(actionTypes.REJECT_CHANGES, rejectChanges)
    }
  })

  /**
   * Make your model definitions known to the cache store.
   * @param  {Immutable.Map}
   * @param  {Array[Model]}
   * @returns {Immutable.Map}
   */
  function registerModels(state, models) {
    return state.withMutations(state => {
      models.forEach(model => {
        state.setIn(['models', model.ENTITY], toImmutable(model.serialize()))
      })
      return state;
    })
  }

  /**
   * Insert a new set of initial values of a type into the store.
   * @param  {Immutable.Map}
   * @param  {Model}
   * @param  {Array[Object]}
   * @returns {Immutable.Map}
   */
  function loadRecords(state, {model, records}) {
    if (!model || !state.getIn(['models', model.ENTITY])) {
      throw new Error(`Unregistered model: ${model}`)
    }
    return state.withMutations(state => {
      records.forEach(record => {
        let r = toImmutable(record)
        let key = r.getIn(model.KEYPATH)
        if (!key) {
          throw new Error(`Undefined key for ${model.ENTITY} at ${model.KEYPATH}`)
        }
        state.setIn(['initialValues', model.ENTITY, key], r)
        state.setIn(['currentValues', model.ENTITY, key], r)
        state.getIn(['models', model.ENTITY, 'FOREIGN_KEYS']).forEach((getter, relType) => {
          let relID = r.getIn(getter)
          let keys = _relativeKeys(state, relType, relID, model.ENTITY)
          state.setIn(['_inverseForeignKeyIndex', relType, relID, model.ENTITY], keys.add(key))
        })
        state.getIn(['models', model.ENTITY, 'INVERSE_FOREIGN_KEYS']).forEach((ifk, relType) => {
          let rpk = _primaryKey(state, relType);
          let relatives = (state.getIn(['currentValues', relType]) || Immutable.List())
            .filter(e => e.getIn(ifk) === key)
            .map(e => e.getIn(rpk))
            .toSetSeq()
            .toSet()
          state.setIn(['_inverseForeignKeyIndex', model.ENTITY, key, relType], relatives)
        })
      })
      return state
    })
  }

  /**
   * Insert a new current value of a type into the store, passing a default value.
   * @param  {Immutable.Map}
   * @param  {Model}
   * @param  {Object}
   * @returns {Immutable.Map}
   */
  function createRecord(state, {model, value}) {
    if (!model || !state.getIn(['models', model.ENTITY])) {
      throw new Error(`Unregistered model: ${model}`)
    }
    return state.withMutations(state => {
      let key = state.get('_nextKey')
      let r = toImmutable(value).setIn(model.KEYPATH, key)
      state.set('_nextKey', key - 1)
      state.setIn(['currentValues', model.ENTITY, key], r)
      state.getIn(['models', model.ENTITY, 'FOREIGN_KEYS']).forEach((getter, relType) => {
        let relID = r.getIn(getter)
        if (!!relID) {
          let newRels = _relativeKeys(state, relType, relID, model.ENTITY).add(key)
          state.setIn(['_inverseForeignKeyIndex', relType, relID, model.ENTITY], newRels)
        }
      })
      return state
    })
  }

  /**
   * Reset the initial and current value of some record to the provided value.
   * Passing null for the new value causes the record to be removed from the store.
   * Deletes will cascade along inverse foreign keys, so that children are removed when a parent is.
   * Primary key updates will cascade along foreign keys.
   * @param  {Immutable.Map}
   * @param  {Model}
   * @param  {Number|String}
   * @param  {Object|null}
   * @returns {Immutable.Map}
   */
  function acceptChanges(state, {model, key, value}) {

    state = _removeRecord(state, {model: model, key: key})
    if (value === null) {
      state = _iterdependents(state, model, key, (state, relIDPath, relType, relMap, relID) => {
        return acceptChanges(state, {model: {ENTITY: relType}, key: relID, value: null})
      })
      return state
    }
    let r = toImmutable(value)
    let newKey = r.getIn(_primaryKey(state, model.ENTITY))
    state = _iterdependents(state, model, key, (state, relIDPath, relType, relMap, relID) => {
      let curKey = ['currentValues', relType, relID]
      let cur = state.getIn(curKey)
      return state.setIn(curKey, cur.setIn(relIDPath, newKey))
    })
    state = state.deleteIn(['_inverseForeignKeyIndex', model.ENTITY, newKey])
    return loadRecords(state, {model: model, records: [r]})
  }

  /**
   * Mark a record as pending delete.
   * @param {Immutable.Map}
   * @param {Model}
   * @param {Number|String}
   */
  function setDeleted(state, {model, key}) {
    let deleted = _deletedKeys(state, model)
    return state.setIn(['deleted', model.ENTITY], deleted.add(key))
  }

  /**
   * Replace the current value of a record with a new value.
   * @param {Immutable.Map}
   * @param {Model}
   * @param {Number|String}
   * @param {Immutable.Map}
   */
  function updateRecord(state, {model, key, value}) {
    return state.setIn(['currentValues', model.ENTITY, key], toImmutable(value))
  }

  function rejectChanges(state, {model, key}) {
    let iv = state.getIn(['initialValues', model.ENTITY, key])
    if (!iv) {
      return acceptChanges(state, {model: model, key: key, value: null})
    }
    return state.withMutations(state => {
      state.setIn(['currentValues', model.ENTITY, key], iv)
      state.setIn(['deleted', model.ENTITY], _deletedKeys(state, model).delete(key))
    })
  }

  function _iterdependents(state, model, key, callback) {
    state.getIn(['models', model.ENTITY, 'INVERSE_FOREIGN_KEYS']).forEach((relIDPath, relType) => {
      let relMap = state.getIn(['_inverseForeignKeyIndex', model.ENTITY, key, relType])
      _relativeKeys(state, model.ENTITY, key, relType).forEach((relID) => {
        state = callback(state, relIDPath, relType, relMap, relID)
      })
    })
    return state
  }

  function _removeRecord(state, {model, key}) {
    return state.withMutations(state => {
      state.deleteIn(['initialValues', model.ENTITY, key])
      state.deleteIn(['currentValues', model.ENTITY, key])
    })
  }

  function _relativeKeys(state, modelName, key, relType) {
    let pk = _primaryKey(state, relType);
    let rkp = state.getIn(['models', modelName, 'INVERSE_FOREIGN_KEYS', relType])
    let currentValues = state.getIn(['currentValues', relType]) || Immutable.Map()
    return currentValues
      .filter(r => r.getIn(rkp) === key)
      .map(r => r.getIn(pk))
      .toSet();
  }

  function _primaryKey(state, modelName) {
    return state.getIn(['models', modelName, 'KEYPATH']);
  }

  function _deletedKeys(state, modelName) {
    return state.getIn(['deleted', modelName]) || Immutable.Set();
  }
}
