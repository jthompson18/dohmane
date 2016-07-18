import Model from '../../model'

let NS = 'TEST_STORE'

export const models = {
  Org: new Model({
    NAMESPACE: NS,
    ENTITY: 'Org',
    KEYPATH: ['id'],
    FOREIGN_KEYS: {},
    INVERSE_FOREIGN_KEYS: {
      User: ['org_id']
    },
    FIELDS: []
  }),
  User: new Model({
    NAMESPACE: NS,
    ENTITY: 'User',
    KEYPATH: ['id'],
    FOREIGN_KEYS: {
      Org: ['org_id']
    },
    INVERSE_FOREIGN_KEYS: {},
    FIELDS: []
  })
}
