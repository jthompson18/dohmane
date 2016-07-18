/**
 * Get namespaced actions for your cache.
 * In general you should access these via an instance of the `Cache` class.
 * @param  {String} namespace - Will prefix all action values.
 * @returns {Object}
 */
export function actionTypes(namespace) {
  return {
    REGISTER_MODELS: `${namespace}_REGISTER_MODELS`,
    LOAD_RECORDS: `${namespace}_LOAD_RECORDS`,
    CREATE_RECORD: `${namespace}_CREATE_RECORD`,
    ACCEPT_CHANGES: `${namespace}_ACCEPT_CHANGES`,
    UPDATE_RECORD: `${namespace}_UPDATE_RECORD`,
    SET_DELETED: `${namespace}_SET_DELETED`,
    REJECT_CHANGES: `${namespace}_REJECT_CHANGES`
  }
}
