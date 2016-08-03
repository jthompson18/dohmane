import { fromJS } from 'immutable';

/**
 * Get a new, empty store.
 * @return {Immutable.Map}
 */
export function newStore() {
  return fromJS({
    initial: {},
    current: {},
    deleted: {},
    _nextKey: -1
  });
}
