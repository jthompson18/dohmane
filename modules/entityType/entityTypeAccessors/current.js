import { is, Map } from 'immutable';

/**
 * The `EntityTypeCurrentAccessors` class provides methods for managing
 * the state of the current values of records for a specific entity type.
 * Application code will mainly interact with the `current` bucket; whereas
 * the `initial` and `deleted` buckets basically provide metadata about the
 * state of a record (ie what it looked like when it was accepted, whether it is
 * deleted), the `current` bucket represents the current working state of a record.
 */
export class EntityTypeCurrentAccessors {
  /**
   * The `EntityTypeCurrentAccessors` constructor.
   * @param  {EntityType} entityType - The parent EntityType instance.
   */
  constructor(entityType) {
    this.entityType = entityType;
  }
  /**
   * Get the current value for a particular record.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String|Number} recordKey - The primary key of the record to fetch.
   * @return {Immutable.Map|undefined} - The current version of this record if any.
   */
  get(store, recordKey) {
    return store.getIn(['current', this.entityType.name, recordKey]);
  }
  /**
   * Establish the current value for a particular record.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String|Number} recordKey - The primary key of the record to set.
   * @param  {Immutable.Map} record - The newly current version of the record.
   * @return {Immutable.Map} - An updated copy of the store.
   */
  set(store, recordKey, record) {
    return store.setIn(['current', this.entityType.name, recordKey], record);
  }
  /**
   * Get all of the current values for this record type.
   * @param  {Immutable.Map} store - The current object store.
   * @return {Immutable.Map} - All of the current values for this record type.
   */
  getAll(store) {
    return store.getIn(['current', this.entityType.name]) || Map();
  }
  /**
   * Get all of the current record values for this type which have defined accepted
   * values that are unequal to the current value, and are not deleted.
   * @param  {Immutable.Map} store - The current object store.
   * @return {Immutable.Map} - All of the changed record values for this type.
   */
  getAllChanged(store) {
    return this.entityType.current.getAll(store)
      .filter(record => {
        const pk = this.entityType.keyFor(record);
        const initial = this.entityType.initial.get(store, pk);
        return (
          initial &&
          !this.entityType.deleted.get(store, pk) &&
          !is(initial, record)
        );
      });
  }
  /**
   * Get all of the current record values for this type which do not have an
   * accepted value and are not deleted.
   * @param  {Immutable.Map} store - The current object store.
   * @return {Immutable.Map} - All of the new record values for this type.
   */
  getAllNew(store) {
    return this.getAll(store)
      .filter(record => !this.entityType.initial.get(store, this.entityType.keyFor(record)));
  }
  /**
   * Get only the key/value pairs from the current value of a record which differ
   * from the last accepted value for this record.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String|Number} recordKey - The primary key of the record you want the changeset from.
   * @return {Immutable.Map} - The record, containing only changed keys.
   */
  getChangedProperties(store, recordKey) {
    let initial = this.entityType.initial.get(store, recordKey);
    let cur = this.get(store, recordKey);
    if (!initial) {
      return cur;
    }
    return cur.filter((value, propKey) => !is(value, initial.get(propKey)));
  }
  /**
   * Insert a new record into the current values bucket. If the record doesn't
   * already have a primary key, a new primary key will be automatically assigned.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {Object|Immutable.Map|undefined} record - The initial value of the new record.
   * An empty record with a new primary key will be created if omitted.
   * @return {Object} - An object with keys for the new copy of the store,
   * the new primary key, and the newly created record.
   */
  create(store, record) {
    record = this.entityType.raise(record || {});
    let pk = this.entityType.keyFor(record);
    if (!pk) {
      pk = store.get('_nextKey');
      store = store.set('_nextKey', pk - 1);
      record = record.setIn(this.entityType.key, pk);
    }
    store = this.set(store, pk, record);
    return {store, record, pk};
  }
  /**
   * Accept a record, updating the initial and current values to be equal to
   * the given value. If the new accepted value has a different primary key from
   * the old value, the primary key change will cascade to children along all
   * inverse foreign key relations.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String|Number} recordKey - The primary key of the record to accept.
   * If the primary key has changed in the value to accept, then this should be
   * the *old* primary key.
   * @param  {Immutable.Map|Object} record - The record value to accept.
   * @return {Immutable.Map} - A new copy of the store.
   */
  accept(store, recordKey, record) {
    record = this.entityType.raise(record);
    let cur = this.get(store, recordKey);
    let pk = this.entityType.keyFor(record);
    if (recordKey !== pk) {
      Object.keys(this.entityType.inverseForeignKeys).forEach(relName => {
        let relT = this.entityType.accessors[relName];
        this.entityType.children(store, relName, cur).forEach(child => {
          store = relT.foreignKey.set(store, this.entityType.name, child, pk).store;
        });
      });
      store = store.deleteIn(['current', this.entityType.name, recordKey]);
    }
    return this.entityType.initial.set(store, pk, record);
  }
  /**
   * Reject the current changes for a record. If the record is new, it will
   * be deleted (along with children); if it is modified, then the current
   * value will be replaced with the last accepted value; records pending delete
   * will be returned to an unmodified state.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String|Number} recordKey - The primary key of the record to reject.
   * @return {Immutable.Map} - A new copy of the store.
   */
  reject(store, recordKey) {
    let initial = this.entityType.initial.get(store, recordKey);
    if (initial) {
      store = this.entityType.deleted.reject(store, recordKey);
      return this.entityType.current.set(store, recordKey, initial);
    }
    return this.delete(store, recordKey);
  }
  /**
   * Mark a record as deleted. If it is new, it will be removed from the
   * cache completely; if it has an accepted value, then it will be placed
   * in the deleted bucket.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String|Number} recordKey - The primary key of the record to delete.
   * @return {Immutable.Map} - A new copy of the store.
   */
  delete(store, recordKey) {
    let cur = this.get(store, recordKey);
    Object.keys(this.entityType.inverseForeignKeys).forEach(relName => {
      let relT = this.entityType.accessors[relName];
      this.entityType.children(store, relName, cur).forEach((rel, relPK) => {
        store = relT.current.delete(store, relPK);
      });
    });
    let initial = this.entityType.initial.get(store, recordKey);
    if (!initial) {
      return store.deleteIn(['current', this.entityType.name, recordKey]);
    }
    return this.entityType.deleted.set(store, recordKey, cur);
  }
}
