import { fromJS } from 'immutable';
import { EntityTypeForeignKeyAccessors } from './entityTypeAccessors/foreignKey';
import { EntityTypeInitialAccessors } from './entityTypeAccessors/initial';
import { EntityTypeCurrentAccessors } from './entityTypeAccessors/current';
import { EntityTypeDeletedAccessors } from './entityTypeAccessors/deleted';
import { ENTITY_STATE } from './states';

/**
 * The `EntityType` class is the top-level interface for interacting with
 * records of a particular type in the store. It is an umbrella for a set of
 * more specific acccessor classes, which it instantiates on init.
 */
export class EntityType {
  /**
   * The `EntityType` constructor.
   * @param  {Object<String, EntityType>} accessors - An object containing all of the `EntityType`
   * instances related to this store, allowing this `EntityType` instance to call
   * methods on related `EntityType` instances.
   * @param  {String} name - The name of this entity type.
   * @param  {Array<String>} options.key - The primary key keypath for this entity type.
   * @param  {Object<String, Array<String>>} options.foreignKeys - A map of related
   * entity type names to the keypath to the foreign key for the related type on this type.
   * @param  {Object<String, Array<String>>} options.inverseForeignKeys - A map of related
   * entity type names to the keypath to the foreign key for this type on the related type.
   */
  constructor(accessors, name, {key, foreignKeys, inverseForeignKeys}) {
    /**
     * This entity's type name.
     * @type {String}
     */
    this.name = name;
    /**
     * An object containing all of the `EntityType`
     * instances related to this store, allowing this `EntityType` instance to call
     * methods on related `EntityType` instances.
     * @type {Object<String, EntityType>}
     */
    this.accessors = accessors;
    /**
     * The primary key path for this record type.
     *
     * @example
     * ['id']  // a simple keypath
     * ['nested', 'id']  // a nested keypath, e.g. to {nested: {id: 1}}
     * @type {Array<String>}
     */
    this.key = key;
    /**
     * A map of related entity type names to the keypath for the foreign key
     * for the related type on this type.
     *
     * For example, if this is a `User`, and the user belongs to an `Account`,
     * you might have
     *
     * @example
     * {Account: ['account_id']}
     * @type {Object<String, Array<String>>}
     */
    this.foreignKeys = foreignKeys;
    /**
     * A map of related entity type names to the keypath for the foreign key
     * for this type on the related type.
     *
     * For example, if this is an `Account`, and it has many users, you might have
     *
     * @example
     * {User: ['account_id']}
     * @type {Object<String, Array<String>>}
     */
    this.inverseForeignKeys = inverseForeignKeys;

    /**
     * Accessors for getting / setting foreign keys on this type.
     * @type {EntityTypeForeignKeyAccessors}
     */
    this.foreignKey = new EntityTypeForeignKeyAccessors(this);
    /**
     * Interface for the `initial` bucket for this type.
     * @type {EntityTypeInitialAccessors}
     */
    this.initial = new EntityTypeInitialAccessors(this);
    /**
     * Interface for the `current` bucket for this type.
     * @type {EntityTypeCurrentAccessors}
     */
    this.current = new EntityTypeCurrentAccessors(this);
    /**
     * Interface for the `deleted` bucket for this type.
     * @type {EntityTypeDeletedAccessors}
     */
    this.deleted = new EntityTypeDeletedAccessors(this);
  }
  /**
   * Ensure an object is immutable.
   * @param  {Object|Immutable.Map} obj - The object to raise.
   * @return {Immutable.Map} - An immutable representation of `obj`.
   */
  raise(obj) {
    if (obj && obj.toJS) {
      return obj;
    }
    return fromJS(obj);
  }
  /**
   * Get a record's primary key.
   * @param  {Immutable.Map} record - The record to get the key from.
   * @return {String|Number} - The primary key.
   */
  keyFor(record) {
    return record.getIn(this.key);
  }
  /**
   * Get a string representation of the state of this record,
   * whether it is deleted, unchanged, modified or new.
   * @param  {Immutable.Map} store  - The current object store.
   * @param  {Immutable.Map} record - The record to check.
   * @return {String} - The current state; see `ENTITY_STATE` above.
   */
  state(store, record) {
    let pk = this.keyFor(record);
    if (this.deleted.get(store, pk)) {
      return ENTITY_STATE.DELETED;
    }
    let initial = this.initial.get(store, pk);
    let current = this.current.get(store, pk);
    if (initial && current) {
      if (initial.equals(current)) {
        return ENTITY_STATE.UNCHANGED;
      }
      return ENTITY_STATE.MODIFIED;
    }
    if (current) {
      return ENTITY_STATE.NEW;
    }
    throw new Error(`Unknown state for ${pk}`);
  }
  /**
   * Get the current values of all the records of a given type related to the
   * given record via a foreign key.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String} relName - The name of the related type. The given record
   * must have a foreign key that points to the related type.
   * @param  {Immutable.Map} record  - The source record you want the parents of.
   * @return {Immutable.Map} - The related type's current records map,
   * filtered to only include relatives along the foreign key relationship.
   */
  parents(store, relName, record) {
    let fk = this.foreignKey.get(record, relName);
    let relT = this.accessors[relName];
    return relT.current
      .getAll(store)
      .filter(rel => relT.keyFor(rel) === fk);
  }
  /**
   * Get the current values of all the records of a given type related to the
   * given record via an inverse foreign key.
   * @param  {Immutable.Map} store - The current object store.
   * @param  {String} relName - The name of the related type. The related records
   * must have a foreign key that points to the source type.
   * @param  {Immutable.Map} record - The source record you want the children of.
   * @return {Immutable.Map} - The related type's current records map,
   * filtered to only include relatives along the inverse foreign key relationship.
   */
  children(store, relName, record) {
    let pk = this.keyFor(record);
    let relT = this.accessors[relName];
    return relT.current
      .getAll(store)
      .filter(rel => relT.foreignKey.get(rel, this.name) === pk);
  }
}
