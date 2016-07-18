import {toImmutable, Immutable} from 'nuclear-js'
import { isFunction } from 'lodash/lang'

/**
 * The `Model` class holds metadata about and entity type, and provides getters
 * that leverage this metadata against the Cache Store in the given namespace.
 */
export default class Model {
  /**
   * @param  {String} NAMESPACE - Should match the namespace of the Cache where these models will live.
   * @param  {String} ENTITY - The name of this entity.
   * @param  {Array[String]} KEYPATH - Simple getter to the primary key of an instance of this type.
   * @param  {Object[String, Array[String]]} FOREIGN_KEYS - A map of related type names to a getter of the foreign key on records of this type to that type.
   * @param  {Object[String, Array[String]]} INVERSE_FOREIGN_KEYS - A map of related type names to a getter of the inverse foreign key on records of that type to this type.
   * @param  {Array[Object]} FIELDS - TODO: These provide metadata for particular fields of records of this type.
   * @returns {null}
   */
  constructor({
    NAMESPACE,
    ENTITY,
    KEYPATH,
    FOREIGN_KEYS,
    INVERSE_FOREIGN_KEYS,
    FIELDS
  }) {
    this.NAMESPACE = NAMESPACE
    this.ENTITY = ENTITY
    this.KEYPATH = KEYPATH
    this.FOREIGN_KEYS = FOREIGN_KEYS
    this.INVERSE_FOREIGN_KEYS = INVERSE_FOREIGN_KEYS
    this.FIELDS = FIELDS

    this.initializeGetters()
  }

  /**
   * Get a data-only representation of the properties of this model.
   * This is necesssary because by default Immutable won't convert a class
   * instance to an Immutable.Map, so for instance `getIn` will fail silently
   * against a class.
   * @returns {Object}
   */
  serialize() {
    return {
      NAMESPACE: this.NAMESPACE,
      ENTITY: this.ENTITY,
      KEYPATH: this.KEYPATH,
      FOREIGN_KEYS: this.FOREIGN_KEYS,
      INVERSE_FOREIGN_KEYS: this.INVERSE_FOREIGN_KEYS,
      FIELDS: this.FIELDS
    }
  }

  /**
   * Create getters specific to this model. Getters may depend on each other,
   * so order matters here.
   * @returns {null}
   */
  initializeGetters() {
    this.initialValues = this.createInitialValuesGetter()
    this.currentValues = this.createCurrentValuesGetter()
    this.deletedKeys = this.createDeletedKeysGetter()
    this.changedRecords = this.createChangedRecordsGetter()
    this.changeSet = this.createChangeSetGetter()
    this.newRecords = this.createNewRecordsGetter()
    this.deletedRecords = this.createDeletedRecordsGetter()
  }

  /**
   * Get the initial values for an entity type.
   * @returns {Array[String]}
   */
  createInitialValuesGetter() {
    return [
      [this.NAMESPACE, 'initialValues', this.ENTITY],
      (initialValues) => initialValues || Immutable.Map()
    ]
  }

  /**
   * Get the current values for an entity type.
   * @returns {Array[String]}
   */
  createCurrentValuesGetter() {
    return [
      [this.NAMESPACE, 'currentValues', this.ENTITY],
      (currentValues) => currentValues || Immutable.Map()
    ]
  }

  /**
   * Get the keys of the records of an entity type which have been marked deleted.
   * @returns {Array[String]}
   */
  createDeletedKeysGetter() {
    return [
      [this.NAMESPACE, 'deleted', this.ENTITY],
      (deleted) => deleted || Immutable.Set()
    ]
  }

  /**
   * Get records of some type which have changes changed.
   * @returns {Immutable.List}
   */
  createChangedRecordsGetter() {
    return [
      this.initialValues,
      this.currentValues,
      this.deletedKeys,
      function(initialValues, currentValues, deletedKeys) {
        return initialValues
          .filter((_, key) => !deletedKeys.has(key))
          .reduce((changed, iv, key) => {
            let cv = currentValues.get(key)
            if (!iv.equals(cv)) {
              return changed.push(cv)
            } else {
              return changed
            }
          }, Immutable.List())
      }
    ]
  }

  /**
   * Get just the changed fields from just the changed records.
   * @returns {Immutable.Map}
   */
  createChangeSetGetter() {
    let keypath = this.KEYPATH
    return [
      this.initialValues,
      this.changedRecords,
      function(initialValues, changedRecords) {
        return changedRecords.map((record) => {
          let iv = initialValues.get(record.getIn(keypath))
          if (!iv) {
            return record
          }
          return record.reduce((changeset, value, key) => {
            let ivv = iv.get(key)
            if (ivv && isFunction(ivv.equals)) {
              if (!ivv.equals(value)) {
                return changeset.set(key, value)
              }
            } else {
              if (ivv !== value) {
                return changeset.set(key, value)
              }
            }
            return changeset
          }, Immutable.Map())
        })
      }
    ]
  }

  /**
   * Get just the records that are new (i.e. have never loaded nor accepted changes).
   * @returns {Immutable.List}
   */
  createNewRecordsGetter() {
    let keypath = this.KEYPATH
    return [
      this.initialValues,
      this.currentValues,
      function(initialValues, currentValues) {
        return currentValues.filter(record => {
          return !initialValues.get(record.getIn(keypath))
        }).toIndexedSeq()
      }
    ]
  }

  /**
   * Get just the records that are deleted.
   * @returns {Immutable.List}
   */
  createDeletedRecordsGetter() {
    return [
      this.currentValues,
      this.deletedKeys,
      function(currentValues, deleted) {
        return deleted.map(key => currentValues.get(key))
      }
    ]
  }
}
