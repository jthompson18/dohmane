/* globals describe, it, beforeEach */
import { is, Map } from 'immutable';
import { expect } from 'chai';
import { newStore } from './store';
import { entityTypeAccessors } from './accessors';
import { ENTITY_STATE } from './states';

describe('modules/newStore', function() {

  describe('#store', function() {
    it('initializes to an empty state', function() {
      let store = newStore();
      expect(store.toJS()).to.deep.equal({
        initial: {},
        current: {},
        deleted: {},
        _nextKey: -1
      });
    });
  });

  describe('#entityTypes', function() {

    let typedefs = {
      AdAccount: {
        key: ['id'],
        foreignKeys: {},
        inverseForeignKeys: {
          AdCampaign: ['account_id']
        }
      },
      AdCampaign: {
        key: ['id'],
        foreignKeys: {
          AdAccount: ['account_id']
        },
        inverseForeignKeys: {
          Ad: ['campaign_id']
        }
      },
      Ad: {
        key: ['id'],
        foreignKeys: {
          AdCampaign: ['campaign_id']
        },
        inverseForeignKeys: {}
      }
    };

    let accounts = [
      {
        id: 1,
        name: 'Test Account'
      }
    ];

    let campaigns = [
      {
        id: 2,
        name: 'camp',
        account_id: 1
      }
    ];

    beforeEach(function() {
      this.store = newStore();
      this.accessors = entityTypeAccessors(typedefs);
    });

    it('generates accessors from model type definitions', function() {
      expect(this.accessors).to.have.ownProperty('AdAccount');
      expect(this.accessors).to.have.ownProperty('AdCampaign');
      expect(this.accessors).to.have.ownProperty('Ad');
    });

    it('provides a method for "raising" objects to immutable objects', function() {
      let account = this.accessors.AdAccount.raise(accounts[0]);
      expect(account).to.have.property('toJS').that.is.a('function');
    });

    it('gets the primary key based on the typedef', function() {
      let account = this.accessors.AdAccount.raise(accounts[0]);
      expect(this.accessors.AdAccount.keyFor(account)).to.equal(1);
    });

    it('gets foreign keys based on the typedef', function() {
      let campaign = this.accessors.AdCampaign.raise(campaigns[0]);
      expect(this.accessors.AdCampaign.foreignKey.get(campaign, 'AdAccount')).to.equal(1);
    });

    it('updates foreign keys based on the typedef', function() {
      let campaign = this.accessors.AdCampaign.raise(campaigns[0]);
      let {store, record} = this.accessors.AdCampaign.foreignKey.set(this.store, 'AdAccount', campaign, 2);
      expect(store).to.exist;
      expect(this.accessors.AdCampaign.foreignKey.get(record, 'AdAccount')).to.equal(2);
    });

    describe('#initial', function() {
      it('provides accessors for interacting with the initial state of records', function() {
        expect(this.accessors.AdAccount.initial.getAll(this.store)).to.equal(Map());
        let account = this.accessors.AdAccount.raise(accounts[0]);
        let accountID = account.get('id');
        let store = this.accessors.AdAccount.initial.set(this.store, accountID, account);
        expect(this.accessors.AdAccount.initial.get(store, accountID)).to.equal(account);
        expect(is(this.accessors.AdAccount.initial.getAll(store),
          Map().set(accountID, account))).to.be.true;
      });
      describe('#load', function() {
        it('loads a set of POJOs into the store as unchanged records', function() {
          let store = this.accessors.AdAccount.initial.load(this.store, accounts);
          expect(is(
            this.accessors.AdAccount.initial.getAll(store),
            Map().set(accounts[0].id, Map(accounts[0]))
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map().set(accounts[0].id, Map(accounts[0]))
          )).to.be.true;
        });
        it('loads a set of Immutable Maps into the store as unchanged records', function() {
          const immutableAccounts = accounts.map(r => this.accessors.AdAccount.raise(r));
          let store = this.accessors.AdAccount.initial.load(this.store, immutableAccounts);
          expect(is(
            this.accessors.AdAccount.initial.getAll(store),
            Map().set(immutableAccounts[0].get('id'), immutableAccounts[0])
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map().set(immutableAccounts[0].get('id'), immutableAccounts[0])
          )).to.be.true;
        });
      });
    });

    describe('#current', function() {
      describe('#getAll', function() {
        it('returns a map of all current values for a type.', function() {
          expect(this.accessors.AdAccount.current.getAll(this.store)).to.equal(Map());
          let account = this.accessors.AdAccount.raise(accounts[0]);
          let accountID = account.get('id');
          const store = this.store.setIn(['current', 'AdAccount', accountID], account);
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map().set(accountID, account))).to.be.true;
        });
      });

      describe('#getAllChanged', function() {
        it('returns a map of current records that don\'t match their initial values.', function() {
          expect(this.accessors.AdAccount.current.getAllChanged(this.store)).to.equal(Map());
          let account = this.accessors.AdAccount.raise(accounts[0]);
          let accountID = account.get('id');
          let store = this.accessors.AdAccount.initial.set(this.store, accountID, account);
          let rev = account.set('name', 'tester');
          store = this.accessors.AdAccount.current.set(store, accountID, rev);
          expect(is(
            this.accessors.AdAccount.current.getAllChanged(store),
            Map().set(accountID, rev)
          )).to.be.true;
        });

        it('excludes deleted records from the changed', function() {
          let account = this.accessors.AdAccount.raise(accounts[0]);
          let accountID = account.get('id');
          let store = this.accessors.AdAccount.initial.set(this.store, accountID, account);
          let rev = account.set('name', 'tester');
          store = this.accessors.AdAccount.current.set(store, accountID, rev);
          store = this.accessors.AdAccount.current.delete(store, accountID);
          expect(this.accessors.AdAccount.current.getAllChanged(store))
            .to.equal(Map());
        });

        it('excludes new records from the changed', function() {
          let account = this.accessors.AdAccount.raise(accounts[0]);
          let accountID = account.get('id');
          let store = this.accessors.AdAccount.current.set(this.store, accountID, account);
          expect(this.accessors.AdAccount.current.getAllChanged(store))
            .to.equal(Map());
        });
      });

      describe('#getChangedProperties', function() {
        it('returns only the keys that have changed in a record', function() {
          let account = this.accessors.AdAccount.raise(accounts[0]);
          let accountID = account.get('id');
          let store = this.accessors.AdAccount.initial.set(this.store, accountID, account);
          let rev = account.set('name', 'tester');
          store = this.accessors.AdAccount.current.set(store, accountID, rev);
          expect(is(
            this.accessors.AdAccount.current.getChangedProperties(store, accountID),
            Map().set('name', 'tester')
          )).to.be.true;
          rev = rev.set('name', account.get('name'));
          store = this.accessors.AdAccount.current.set(store, accountID, rev);
          expect(this.accessors.AdAccount.current.getAllChanged(store))
            .to.equal(Map());
        });
      });

      describe('#create', function() {
        it('produces a new map in `current` only, with a fresh, negative PK', function() {
          let {store, record, pk} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
          expect(pk).to.equal(-1);
          expect(record.get('id')).to.equal(pk);
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map().set(pk, record)
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.current.getAllNew(store),
            Map().set(pk, record)
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.current.getAllChanged(store),
            Map()
          )).to.be.true;
        });
      });

      describe('#accept', function() {
        it('moves created records to an existing, unchanged state', function() {
          let {store, pk, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
          store = this.accessors.AdAccount.current.accept(store, pk, record);
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map().set(pk, record)
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.initial.getAll(store),
            Map().set(pk, record)
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.current.getAllNew(store),
            Map()
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.current.getAllChanged(store),
            Map()
          )).to.be.true;
        });

        it('propagates PK changes along inverse foreign keys', function() {
          let account = this.accessors.AdAccount.current.create(this.store, accounts[0]);
          let campaign = this.accessors.AdCampaign.current.create(account.store, campaigns[0]);
          let store = this.accessors.AdAccount.current.accept(campaign.store, account.pk, account.record.set('id', 5));
          expect(this.accessors.AdCampaign.current.get(store, campaign.pk).get('account_id'))
            .to.equal(5);
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map().set(5, account.record.set('id', 5))
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.initial.getAll(store),
            Map().set(5, account.record.set('id', 5))
          )).to.be.true;
        });
      });

      describe('#reject', function() {
        it('removes unaccepted records completely', function() {
          let {store, pk} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
          store = this.accessors.AdAccount.current.reject(store, pk);
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map()
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.initial.getAll(store),
            Map()
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.deleted.getAll(store),
            Map()
          )).to.be.true;
        });
        it('restores changed records to the last accepted state', function() {
          let {store, pk, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
          let newRecord = record.set('id', 1);
          store = this.accessors.AdAccount.current.accept(store, pk, record.set('id', 1));
          store = this.accessors.AdAccount.current.set(store, 1, newRecord.set('name', 'foo'));
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map().set(1, newRecord.set('name', 'foo'))
          )).to.be.true;
          store = this.accessors.AdAccount.current.reject(store, 1);
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map().set(1, newRecord)
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.initial.getAll(store),
            Map().set(1, newRecord)
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.deleted.getAll(store),
            Map()
          )).to.be.true;
        });
        it('restores deleted records to the last accepted state', function() {
          let {store, pk, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
          let newRecord = record.set('id', 1);
          store = this.accessors.AdAccount.current.accept(store, pk, record.set('id', 1));
          store = this.accessors.AdAccount.current.delete(store, 1);
          expect(is(
            this.accessors.AdAccount.deleted.getAll(store),
            Map().set(1, newRecord)
          )).to.be.true;
          store = this.accessors.AdAccount.current.reject(store, 1);
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map().set(1, newRecord)
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.initial.getAll(store),
            Map().set(1, newRecord)
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.deleted.getAll(store),
            Map()
          )).to.be.true;
        });
      });

      describe('#delete', function() {
        it('removes unaccepted records completely', function() {
          let {store, pk, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map().set(pk, record)
          )).to.be.true;
          store = this.accessors.AdAccount.current.delete(store, pk);
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map()
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.deleted.getAll(store),
            Map()
          )).to.be.true;
        });
        it('moves changed records to the deleted bucket without removing them from the current bucket', function() {
          let {store, pk, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
          let newRecord = record.set('id', 1);
          store = this.accessors.AdAccount.current.accept(store, pk, record.set('id', 1));
          store = this.accessors.AdAccount.current.delete(store, 1);
          expect(is(
            this.accessors.AdAccount.deleted.getAll(store),
            Map().set(1, newRecord)
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map().set(1, newRecord)
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.current.getAllChanged(store),
            Map()
          )).to.be.true;
        });
      });
    });

    describe('#deleted', function() {
      describe('#getAll', function() {
        it('gets all deleted records', function() {
          expect(is(
            this.accessors.AdAccount.deleted.getAll(this.store),
            Map()
          )).to.be.true;
          let {store, pk, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
          let newRecord = record.set('id', 1);
          store = this.accessors.AdAccount.current.accept(store, pk, record.set('id', 1));
          store = this.accessors.AdAccount.current.delete(store, 1);
          expect(is(
            this.accessors.AdAccount.deleted.getAll(store),
            Map().set(1, newRecord)
          )).to.be.true;
        });
      });
      describe('#get', function() {
        it('gets deleted records', function() {
          expect(this.accessors.AdAccount.deleted.get(this.store, 1)).to.be.undefined;
          let {store, pk, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
          let newRecord = record.set('id', 1);
          store = this.accessors.AdAccount.current.accept(store, pk, record.set('id', 1));
          store = this.accessors.AdAccount.current.delete(store, 1);
          expect(is(
            this.accessors.AdAccount.deleted.get(store, 1),
            newRecord
          )).to.be.true;
        });
      });
      describe('#set', function() {
        it('sets deleted records', function() {
          let {store, pk, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
          store = this.accessors.AdAccount.deleted.set(this.store, pk, record);
          expect(is(
            this.accessors.AdAccount.deleted.get(store, pk),
            record
          )).to.be.true;
        });
      });
      describe('#accept', function() {
        it('removes references to a record from current, initial and deleted buckets', function() {
          let {store, pk, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
          store = this.accessors.AdAccount.current.accept(store, pk, record.set('id', 1));
          store = this.accessors.AdAccount.current.delete(store, 1);
          store = this.accessors.AdAccount.deleted.accept(store, 1);
          expect(is(
            this.accessors.AdAccount.deleted.getAll(store),
            Map()
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map()
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.initial.getAll(store),
            Map()
          )).to.be.true;
        });
        it('propagates deletes along inverse foreign keys', function() {
          let account = this.accessors.AdAccount.current.create(this.store, accounts[0]);
          let campaign = this.accessors.AdCampaign.current.create(account.store, campaigns[0]);
          let store = this.accessors.AdAccount.current.accept(campaign.store, account.pk, account.record.set('id', 5));
          let newAccount = this.accessors.AdAccount.current.get(store, 5);
          let newCamp = this.accessors.AdCampaign.current.get(store, campaign.pk);
          store = this.accessors.AdCampaign.current.accept(store, campaign.pk, newCamp);
          store = this.accessors.AdAccount.current.delete(store, 5);
          expect(is(
            this.accessors.AdCampaign.deleted.getAll(store),
            Map().set(campaign.pk, newCamp)
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.deleted.getAll(store),
            Map().set(5, newAccount)
          )).to.be.true;
          store = this.accessors.AdAccount.deleted.accept(store, 5);
          expect(is(
            this.accessors.AdAccount.deleted.getAll(store),
            Map()
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.current.getAll(store),
            Map()
          )).to.be.true;
          expect(is(
            this.accessors.AdAccount.initial.getAll(store),
            Map()
          )).to.be.true;
          expect(is(
            this.accessors.AdCampaign.deleted.getAll(store),
            Map()
          )).to.be.true;
          expect(is(
            this.accessors.AdCampaign.current.getAll(store),
            Map()
          )).to.be.true;
          expect(is(
            this.accessors.AdCampaign.initial.getAll(store),
            Map()
          )).to.be.true;
        });
      });
      describe('#reject', function() {
        it('removes records from the deleted bucket', function() {
          let {store, pk, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
          store = this.accessors.AdAccount.current.accept(store, pk, record.set('id', 1));
          store = this.accessors.AdAccount.current.delete(store, 1);
          store = this.accessors.AdAccount.deleted.reject(store, 1);
          expect(is(
            this.accessors.AdAccount.deleted.getAll(store),
            Map()
          )).to.be.true;
        });
      });
    });
    describe('#state', function() {
      it('identifies deleted records', function() {
        let {store, pk, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
        store = this.accessors.AdAccount.current.accept(store, pk, record.set('id', 1));
        store = this.accessors.AdAccount.current.delete(store, 1);
        record = this.accessors.AdAccount.current.get(store, 1);
        expect(this.accessors.AdAccount.state(store, record)).to.equal(ENTITY_STATE.DELETED);
      });
      it('identifies unchanged records', function() {
        let {store, pk, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
        store = this.accessors.AdAccount.current.accept(store, pk, record.set('id', 1));
        record = this.accessors.AdAccount.current.get(store, 1);
        expect(this.accessors.AdAccount.state(store, record)).to.equal(ENTITY_STATE.UNCHANGED);
      });
      it('identifies changed records', function() {
        let {store, pk, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
        store = this.accessors.AdAccount.current.accept(store, pk, record.set('id', 1));
        store = this.accessors.AdAccount.current.set(store, 1, record.set('id', 1).set('name', 'foo'));
        record = this.accessors.AdAccount.current.get(store, 1);
        expect(this.accessors.AdAccount.state(store, record)).to.equal(ENTITY_STATE.MODIFIED);
      });
      it('identifies new records', function() {
        let {store, record} = this.accessors.AdAccount.current.create(this.store, {name: 'test'});
        expect(this.accessors.AdAccount.state(store, record)).to.equal(ENTITY_STATE.NEW);
      });
    });
  });
});
