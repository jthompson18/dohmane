# DOHMANE

A pure immutable model store.

## Usage

For each store that you want to create, supply a set of `typedefs`. This will
inform which accessors are created and how they interact with a store. Each type
should specify the path to its primary key, as well as paths to foreign or inverse
foreign keys for related entities. For example,

```javascript
const typedefs = {
  Account: {
    key: ['id'],
    foreignKeys: {},
    inverseForeignKeys: {
      User: ['account_id']
    }
  },
  User: {
    key: ['id'],
    foreignKeys: {
      Account: ['account_id']
    },
    inverseForeignKeys: {}
  }
}
```

Then, you'll create a set of accessors based on your `typedefs`:

```javascript
import { entityTypeAccessors } from 'dohmane/entityType/accessors';
const accessors = entityTypeAccessors(typedefs);
```

You'll also create a new immutable store for your records:

```javascript
import { newStore } from 'dohmane/entityType/store';
let store = newStore();
```

Stores are divided into three buckets. The `initial` bucket holds the last known
accepted value for all records which have one. It serves as the baseline for
rejecting changes, and is an indication that a record is not pending `create`.

The `current` bucket holds the current / working values for all records. A record
that hasn't been uploaded yet should exist in the `current` bucket only; in this
case it is considered `new`. A record is considered `modified` if the value in the
`current` bucket isn't exactly the value in the `initial` bucket.

The `deleted` bucket holds records which have been marked deleted and are still
pending upload. Only records with an accepted value are ever put in the `deleted`
bucket; `new` records are removed from the cache immediately if they are deleted.

### Loading existing records into the store

```javascript
const existingAccounts = [
  {id: 1, name: 'foo'},
  {id: 2, name: 'bar'}
];

// Stores are immutable, so be sure to capture the new value of the store!
store = accessors.Account.initial.load(store, existingAccounts);
```

### Creating a new record

```javascript
// `pk` will be assigned an auto-decrementing negative number if it is not
// given in the `record` argument to `EntityTypeCurrentAccessors#create`;
// but if you supply one that will be used.
// `record` will be an immutable version of your new record.
let { store, pk, record } = accessors.Account.current.create(store, {name: 'baz'});
```

### Editing a record

```javascript
store = accessors.Account.current.set(store, record.set('name', 'changed'));
```

### Deleting a record

```javascript
store = accessors.Account.current.delete(store, 1); // an existing record is moved to the deleted bucket
store = accessors.Account.current.delete(store, -1); // a new record is removed from the store entirely
```

### Accepting changes

```javascript
let { store, pk, record } = accessors.Account.current.create(store, {name: 'baz'});
new Promise((resolve, reject) => {
  upload(record).then(result => {
    // if the primary key changed (because it was assigned by the remote service)
    // then any child users will have their foreign keys automatically updated;
    // this is why you must pass the previous `pk` value here.
    resolve(accessors.Account.current.accept(store, pk, result));
  });
});

// To finalize a delete, call accept on the `deleted` interface instead.
new Promise((resolve, reject) => {
  delete(record).then(result => {
    resolve(accessors.Account.deleted.accept(store, record.id));
  });
});
```

### Fetching records

Results with multiple return values are always given as instances of `Immutable.Map`. The `Immutable.Map` class provides both random access through primary keys (via `get(pk)`) as well as the familiar sequence operations like `map` and `filter`.

```javascript
const allCurrent = accessors.Account.current.getAll(store);
const allChanged = accessors.Account.current.getAllChanged(store);
const allNew = accessors.Account.current.getAllNew(store);
const allDeleted = accessors.Account.deleted.getAll(store);
const myRecord = accessors.Account.current.get(store, 1);

// if you need a list of POJOs:
const allCurrentPOJOs = allCurrent.toList().toJS()

// if you just want the subset of a record's properties which have changed from
// their last known accepted value
const myChangeSet = accessors.Account.current.getChangedProperties(store, 1);
```

## Hacking

```bash
npm install
webpack-dev-server --inline --watch-poll
```


## Docs

```bash
npm install -g esdoc
esdoc -c esdoc.json
open ./dist/docs/store/index.html
```
