/**
 * Constants representing an entity's CRUD state.
 * @type {Object}
 */
export const ENTITY_STATE = {
  /**
   * Records are `UNCHANGED` if their current value is their accepted value.
   * @type {String}
   */
  UNCHANGED: 'UNCHANGED',
  /**
   * Records are `MODIFIED` if their current value differs from the accepted value,
   * and it is not in the `deleted` bucket.
   * @type {String}
   */
  MODIFIED: 'MODIFIED',
  /**
   * Records are `DELETED` if there is an accepted value, and they have been placed
   * in the store's `deleted` bucket, pending upload.
   * Deleting a `NEW` record removes it from the store immediately.
   * @type {String}
   */
  DELETED: 'DELETED',
  /**
   * Records are `NEW` if they appear only in the store's `current` bucket,
   * with no accepted value.
   * @type {String}
   */
  NEW: 'NEW'
};
