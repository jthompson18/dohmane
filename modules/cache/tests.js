import { Reactor, Immutable } from 'nuclear-js'
import { expect } from 'chai'
import Cache from './cache'
import { models } from './worker/tests/models'


describe('modules/cache', function() {
  let Flux = new Reactor({debug: true})

  const NS = 'TEST_STORE'
  const {Org, User} = models
  const cache = new Cache(Flux, NS, [Org, User])

  afterEach(function() {
    Flux.reset()
    Flux.dispatch(cache.actionTypes.REGISTER_MODELS, [Org, User])
  })


  describe('#getInitialState', function() {
    it('should initialize it\s state', function() {
      let initialValues = Flux.evaluateToJS([NS, 'initialValues'])
      expect(initialValues).to.deep.equal({})
    })
  })

  describe('#initialize', function() {


    const orgs = [
      {id: 1, name: 'Org 1'}
    ]

    const users = [
      {id: 1, 'name': 'Trevor', org_id: 1}
    ]

    beforeEach(function() {
      Flux.dispatch(cache.actionTypes.LOAD_RECORDS, {model: Org, records: orgs})
      Flux.dispatch(cache.actionTypes.LOAD_RECORDS, {model: User, records: users})
    })

    it('should register models', function() {
      let models = Flux.evaluateToJS([NS, 'models'])
      expect(models).to.deep.equal({Org: Org.serialize(), User: User.serialize()})
    })

    it('should load records with identical initial and current values', function() {
      let initialValues = Flux.evaluateToJS([NS, 'initialValues'])
      let currentValues = Flux.evaluateToJS([NS, 'currentValues'])
      expect(initialValues).to.deep.equal(currentValues)
      expect(initialValues).to.deep.equal({
        Org: {1: orgs[0]},
        User: {1: users[0]}
      })
    })

    it('should create records with currentValues only, and an automatically assigned ID', function() {
      Flux.dispatch(cache.actionTypes.CREATE_RECORD, {model: User, value: {name: 'Treasure', org_id: 1}})
      expect(Flux.evaluateToJS([NS, '_nextKey'])).to.equal(-2)
      expect(Flux.evaluateToJS([NS, 'initialValues', 'User', -1])).to.be.undefined
      expect(Flux.evaluateToJS([NS, 'currentValues', 'User', -1])).to.deep.equal({
        id: -1,
        name: 'Treasure',
        org_id: 1
      })
      expect(Flux.evaluateToJS(User.newRecords)).to.deep.equal([{
        id: -1,
        name: 'Treasure',
        org_id: 1
      }])
    })

    it('should accept changes gracefully, updating foreign keys', function() {
      const newOrg = {id: 2, name: 'Org 2'}
      Flux.dispatch(cache.actionTypes.CREATE_RECORD, {model: Org, value: {name: 'Org 2'}})
      Flux.dispatch(cache.actionTypes.CREATE_RECORD, {model: User, value: {name: 'Treasure', org_id: -1}})
      Flux.dispatch(cache.actionTypes.ACCEPT_CHANGES, {model: Org, key: -1, value: newOrg})
      expect(Flux.evaluateToJS([NS, 'initialValues', 'Org', 2])).to.deep.equal(newOrg)
      expect(Flux.evaluateToJS([NS, 'currentValues', 'User', -2, 'org_id'])).to.equal(2)
      expect(Flux.evaluateToJS([NS, 'currentValues', 'Org', -1])).to.be.undefined
      Flux.dispatch(cache.actionTypes.ACCEPT_CHANGES, {model: User, key: -2, value: {id: 2, name: 'Treasure', org_id: 2}})
      expect(Flux.evaluateToJS([NS, 'initialValues'])).to.deep.equal(Flux.evaluateToJS([NS, 'currentValues']))
    })

    it('should mark a record deleted without removing its current values', function() {
      Flux.dispatch(cache.actionTypes.SET_DELETED, {model: User, key: users[0].id})
      expect(Flux.evaluateToJS([NS, 'deleted', 'User'])).to.deep.equal([users[0].id])
      expect(Flux.evaluateToJS(User.deletedRecords)).to.deep.equal(users)
    })

    it('should remove deleted records from the cache on commit.', function() {
      Flux.dispatch(cache.actionTypes.ACCEPT_CHANGES, {model: User, key: 1, value: null})
      expect(Flux.evaluateToJS([NS, 'initialValues'])).to.deep.equal({Org: {1: orgs[0]}, User: {}})
      expect(Flux.evaluateToJS([NS, 'currentValues'])).to.deep.equal(Flux.evaluateToJS([NS, 'initialValues']))
    })

    it('should cascade deletes along inverse foreign keys', function() {
      Flux.dispatch(cache.actionTypes.ACCEPT_CHANGES, {model: Org, key: 1, value: null})
      expect(Flux.evaluateToJS([NS, 'initialValues'])).to.deep.equal({Org: {}, User: {}})
      expect(Flux.evaluateToJS([NS, 'currentValues'])).to.deep.equal(Flux.evaluateToJS([NS, 'initialValues']))
    })

    it('should be easy to get changed records, and changing a record back to its original value should remove it from the change set', function() {
      let record = Flux.evaluate([NS, 'currentValues', 'User', users[0].id])
      let newRecord = record.set('name', 'Treasure')
      Flux.dispatch(cache.actionTypes.UPDATE_RECORD, {model: User, key: users[0].id, value: newRecord})
      expect(Flux.evaluateToJS(User.changedRecords)).to.deep.equal([newRecord.toJS()])
    })

    it('should be possible to get just the changed keys in a record', function() {
      let record = Flux.evaluate([NS, 'currentValues', 'User', users[0].id])
      let newRecord = record.set('name', 'Treasure')
      Flux.dispatch(cache.actionTypes.UPDATE_RECORD, {model: User, key: users[0].id, value: newRecord})
      expect(Flux.evaluateToJS(User.changeSet)).to.deep.equal([{name: 'Treasure'}])
    })

    it('should exclude deleted records from changed records', function() {
      let record = Flux.evaluate([NS, 'currentValues', 'User', users[0].id])
      let newRecord = record.set('name', 'Treasure')
      Flux.dispatch(cache.actionTypes.UPDATE_RECORD, {model: User, key: users[0].id, value: newRecord})
      Flux.dispatch(cache.actionTypes.SET_DELETED, {model: User, key: users[0].id})
      expect(Flux.evaluateToJS(User.changeSet)).to.deep.equal([])
    })

    it('should revert changed records to initial values, and delete reverted new records', function() {
      let record = Flux.evaluate([NS, 'currentValues', 'User', users[0].id])
      let newRecord = record.set('name', 'Treasure')
      Flux.dispatch(cache.actionTypes.UPDATE_RECORD, {model: User, key: users[0].id, value: newRecord})
      Flux.dispatch(cache.actionTypes.REJECT_CHANGES, {model: User, key: users[0].id})
      expect(Flux.evaluateToJS(User.changeSet)).to.deep.equal([])
      Flux.dispatch(cache.actionTypes.CREATE_RECORD, {model: User, value: {name: 'Treasure', org_id: 1}})
      expect(Flux.evaluateToJS([NS, 'currentValues', 'User', -1, 'id'])).to.equal(-1)
      Flux.dispatch(cache.actionTypes.REJECT_CHANGES, {model: User, key: -1})
      expect(Flux.evaluateToJS(User.newRecords)).to.deep.equal([])
    })
  })
})
