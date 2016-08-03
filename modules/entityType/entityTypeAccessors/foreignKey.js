/**
 * The `EntityTypeForeignKeyAccessors` class provides an interface for dealing
 * with foreign key relationships amongst records. The getter and setter defined
 * here allow calling code to discover and alter foreign key relationships without
 * having to inspect the typedefs themselves. In general, application code
 * should prefer the `EntityType#parents` and `EntityType#children` methods, which
 * make use of these under the hood.
 */
export class EntityTypeForeignKeyAccessors {
  /**
   * The `EntityTypeForeignKeyAccessors` constructor.
   * @param  {EntityType} entityType - The parent EntityType instance.
   */
  constructor(entityType) {
    this.entityType = entityType;
  }
  /**
   * Get a record's foreign key for another record type.
   * @param  {Immutable.Map} record - The record to get the key from.
   * @param  {String} relName - The name of the type you want the foreign key for.
   * @return {String|Number} - The foreign key value.
   */
  get(record, relName) {
    return record.getIn(this.entityType.foreignKeys[relName]);
  }
  /**
   * Update a record's foreign key value for some type; useful when propagating
   * foreign key changes on accept.
   * @param {Immutable.Map} store - The current object store.
   * @param {String} relName - The name of the entity type that had a primary key change.
   * @param {Immutable.Map} record - The record to receive the foreign key update.
   * @param {String|Number} value - The foreign key's new value.
   * @return {Immutable.Map} - An updated copy of the store.
   */
  set(store, relName, record, value) {
    record = record.setIn(this.entityType.foreignKeys[relName], value);
    let pk = this.entityType.keyFor(record);
    store = this.entityType.current.set(store, pk, record);
    return {store, record};
  }
}
