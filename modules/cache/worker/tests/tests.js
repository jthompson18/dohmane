import Worker from 'worker!./worker'
import WorkerProxy from '../proxy'
import { expect } from 'chai'
import { actionTypes } from '../../actionTypes'
import { models } from './models'

const {Org, User} = models

const orgs = [
  {id: 1, name: 'Org 1'}
]

const users = [
  {id: 1, 'name': 'Trevor', org_id: 1}
]

describe('modules/cache/worker', function() {
  let worker = new Worker
  let NS = 'TEST_STORE'

  let actions = actionTypes(NS)

  let proxy = new WorkerProxy(worker, true)

  afterEach(done => {
    let _done = () => {
      proxy.off()
      done()
    }
    proxy.dispatch('reset').then(_ => _done())
    .catch(_done)
  })

  it('should register models', function(done) {
    proxy.dispatch('evaluate', {getter: [NS, 'models']}).then((models) => {
      expect(models).to.deep.equal({
        Org: {
          NAMESPACE: NS,
          ENTITY: 'Org',
          KEYPATH: ['id'],
          FOREIGN_KEYS: {},
          INVERSE_FOREIGN_KEYS: {
            User: ['org_id']
          },
          FIELDS: []
        },
        User: {
          NAMESPACE: NS,
          ENTITY: 'User',
          KEYPATH: ['id'],
          FOREIGN_KEYS: {
            Org: ['org_id']
          },
          INVERSE_FOREIGN_KEYS: {},
          FIELDS: []
        }
      })
      done()
    }).catch(done)
  })

  it('should create databindings', function(done) {
    proxy.dispatch('getDataBindings', {
      namespace: NS,
      scope: 'userModel',
      bindings: {
        userMap: 'userMap',
        newUsers: 'newUsers',
        changedUsers: 'changedUsers',
        deletedUsers: 'deletedUsers'
      }
    }).then(_ => {
      proxy.dispatch('dispatch', {
        action: actions.LOAD_RECORDS,
        params: {model: User.serialize(), records: users}
      }, 'valueChanged').then((params) => {
        expect(params).to.deep.equal({
          namespace: NS,
          scope: 'userModel',
          key: 'userMap',
          value: {1: users[0]}
        })

        let hits = {userMap: 0, changedUsers: 0}
        let off = proxy.on('valueChanged', ({key}) => {
          if (hits.hasOwnProperty(key)) {
            hits[key] += 1
          }
          if (hits.userMap && hits.changedUsers) {
            off()
            done()
          }
        })
        proxy.dispatch('dispatch', {
          action: actions.UPDATE_RECORD,
          params: {model: User.serialize(), key: 1, value: {id: 1, name: 'Treasure', org_id: 1}}
        }).catch(done)
      }).catch(done)
    }).catch(done)
  })
})
