import { Map } from 'immutable';

/**
 * The `EntityTypeInitialAccessors` class provides accessors over the `initial`
 * bucket. The `initial` bucket holds the last known accepted values for all records
 * which have one. In general, application code will deal strictly with `current`
 * values; the `initial` bucket is used for 1) having a baseline for rejecting
 * the changes to an object and 2) determining whether an object is "new" (that
 * is, doesn't have an accepted value).
 */
export class EntityTypeInitialAccessors {
  /**
   * The `EntityTypeInitialAccessors` constructor.
   * @param  {EntityType} entityType - The parent EntityType instance.
   */
  constructor(entityType) {
    this.entityType = entityType;
  }
  /**
   * Get the accepted value for a particular record.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String|Number} recordKey - The primary key of the record to fetch.
   * @return {Immutable.Map|undefined} - The last accepted version of this record if any.
   */
  get(store, recordKey) {
    return store.getIn(['initial', this.entityType.name, recordKey]);
  }
  /**
   * Establish the accepted value for a particular record.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String|Number} recordKey - The primary key of the record to set.
   * @param  {Immutable.Map} record - The newly accepted version of the record.
   * @return {Immutable.Map} - An updated copy of the store.
   */
  set(store, recordKey, record) {
    store = store.setIn(['initial', this.entityType.name, recordKey], record);
    return this.entityType.current.reject(store, recordKey);
  }
  /**
   * Load a batch of records into the store with initial values equal to current values.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {Array<Immutable.Map|Object>} records - The records to load. These can be POJOs.
   * @return {Immutable.Map} - An updated copy of the store.
   */
  load(store, records) {
    records.forEach(record => {
      record = this.entityType.raise(record);
      const pk = this.entityType.keyFor(record);
      store = this.set(store, pk, record);
    });
    return store;
  }
  /**
   * Get all of the initial values for this record type.
   * @param  {Immutable.Map} store - The current object store.
   * @return {Immutable.Map} - All of the accepted values for this record type.
   */
  getAll(store) {
    return store.getIn(['initial', this.entityType.name]) || Map();
  }
}
