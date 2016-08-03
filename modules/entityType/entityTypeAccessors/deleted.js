import { Map } from 'immutable';

/**
 * The `EntityTypeDeletedAccessors` class provides an interface for the `deleted`
 * bucket. In general, application code will not have to deal directly with these
 * accessors, except to accept records in their deleted state (removing them from
 * the store completely). Records are placed into the `deleted` bucket only if
 * they already have a value in the `initial` bucket; new records are removed
 * immediately on delete.
 */
export class EntityTypeDeletedAccessors {
  /**
   * The `EntityTypeDeletedAccessors` constructor.
   * @param  {EntityType} entityType - The parent EntityType instance.
   */
  constructor(entityType) {
    this.entityType = entityType;
  }
  /**
   * Get all deleted records.
   * @param  {Immutable.Map} store - The current object store.
   * @return {Immutable.Map} - A map containing all deleted records.
   */
  getAll(store) {
    return store.getIn(['deleted', this.entityType.name]) || Map();
  }
  /**
   * Get an individual record from the deleted bucket.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String|Number} recordKey - The primary key of the record to fetch.
   * @return {Immutable.Map|undefined} - The deleted record, if any.
   */
  get(store, recordKey) {
    return store.getIn(['deleted', this.entityType.name, recordKey]);
  }
  /**
   * Set a record in the deleted bucket.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String|Number} recordKey - The primary key of the record to set.
   * @param  {Immutable.Map} record - The record value.
   * @return {Immutable.Map|undefined} - The deleted record, if any.
   */
  set(store, recordKey, record) {
    return store.setIn(['deleted', this.entityType.name, recordKey], record);
  }
  /**
   * Accept a record as deleted, removing all references to it from the store.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String|Number} recordKey - The primary key of the record to accept.
   * @return {Immutable.Map} - A new copy of the store.
   */
  accept(store, recordKey) {
    let cur = this.entityType.current.get(store, recordKey);
    Object.keys(this.entityType.inverseForeignKeys).forEach(relName => {
      let relT = this.entityType.accessors[relName];
      this.entityType.children(store, relName, cur).forEach((rel, relPK) => {
        store = relT.deleted.accept(store, relPK);
      });
    });
    return store
      .deleteIn(['deleted', this.entityType.name, recordKey])
      .deleteIn(['current', this.entityType.name, recordKey])
      .deleteIn(['initial', this.entityType.name, recordKey]);
  }
  /**
   * Reject the deleted state of a record, removing it from the deleted bucket.
   * This is called by `entityType.current.reject`, which is the preferred method.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String|Number} recordKey - The primary key of the deleted record to reject.
   * @return {Immutable.Map} - A new copy of the store.
   */
  reject(store, recordKey) {
    return store.deleteIn(['deleted', this.entityType.name, recordKey]);
  }
}
